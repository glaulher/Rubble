<?php

namespace App\Api\Services;

use App\Config\Database;
use App\Config\Env;
use App\Api\Repositories\PvRepository;
use mysqli;

class PvEmailWatcherService
{
    private PvRepository $repository;
    private mysqli $conn;

    private const APPROVED_TARGET_STATUS = 'Aprovado aquisição/serviço';
    private const RECENT_DAYS = 7;

    public function __construct(?PvRepository $repository = null)
    {
        $this->repository = $repository ?? new PvRepository();
        $this->conn = Database::connect();
    }

    public function process(): array
    {
        $result = [
            'checked' => 0,
            'approved' => 0,
            'errors' => [],
            'mailboxes_searched' => 0,
        ];

        $host = Env::get('IMAP_HOST', '');
        $port = Env::get('IMAP_PORT', '993');
        $user = Env::get('IMAP_USER', '');
        $pass = Env::get('IMAP_PASS', '');
        $mailboxConfig = Env::get('IMAP_MAILBOX', 'INBOX');

        if ($host === '' || $user === '' || $pass === '') {
            $result['errors'][] = 'IMAP not configured';
            return $result;
        }

        $serverPrefix = $this->buildServerPrefix($host, $port);
        $mailboxKey = $this->buildMailboxKey();

        $mbox = @imap_open($serverPrefix . 'INBOX', $user, $pass, OP_READONLY, 0);
        if ($mbox === false) {
            $result['errors'][] = 'IMAP connection failed: ' . imap_last_error();
            return $result;
        }

        $mailboxes = $this->resolveMailboxes($mbox, $serverPrefix, $mailboxConfig);
        $result['mailboxes_searched'] = count($mailboxes);

        foreach ($mailboxes as $fullPath) {
            if (!@imap_reopen($mbox, $fullPath)) {
                continue;
            }
            $this->processMailbox($mbox, $fullPath, $mailboxKey, $result);
        }

        imap_close($mbox);
        return $result;
    }

    private function buildServerPrefix(string $host, string $port): string
    {
        $security = strtolower(Env::get('IMAP_SECURITY', 'ssl'));
        return '{' . $host . ':' . $port . ($security === 'plain' ? '/imap' : '/imap/ssl') . '}';
    }

    private function buildMailboxKey(): string
    {
        $host = trim((string) Env::get('IMAP_HOST', ''));
        $user = trim((string) Env::get('IMAP_USER', ''));
        if ($host === '' || $user === '') {
            return '';
        }
        return $host . ':' . $user;
    }

    private function resolveMailboxes($mbox, string $serverPrefix, string $mailboxConfig): array
    {
        $roots = $this->parseMailboxConfig($mailboxConfig);
        $resolved = [];

        foreach ($roots as $root) {
            $fullRoot = $serverPrefix . $root;
            $resolved[$fullRoot] = true;

            $list = @imap_list($mbox, $serverPrefix, $root . '/%');
            if (is_array($list)) {
                foreach ($list as $entry) {
                    if ($this->isInboxFolder($entry, $serverPrefix)) {
                        $resolved[$entry] = true;
                    }
                }
            }
        }

        return array_keys($resolved);
    }

    private function parseMailboxConfig(string $config): array
    {
        return array_map('trim', explode(',', $config));
    }

    private function isInboxFolder(string $folderPath, string $serverPrefix): bool
    {
        $folder = str_replace($serverPrefix, '', $folderPath);
        return str_starts_with($folder, 'INBOX') || $folder === 'INBOX';
    }

    private function processMailbox($mbox, string $mailboxPath, string $mailboxKey, array &$result): void
    {
        $this->searchUnseen($mbox, $mailboxKey, $result);
        $this->searchRecentSeen($mbox, $mailboxKey, $result);
    }

    private function searchUnseen($mbox, string $mailboxKey, array &$result): void
    {
        $uids = @imap_search($mbox, 'UNSEEN SUBJECT "PV"', SE_UID);
        if ($uids === false || $uids === []) return;

        foreach ($uids as $uid) {
            $uidInt = (int) $uid;
            if ($this->isAlreadyProcessed($uidInt, $mailboxKey)) continue;
            $this->processUid($mbox, $uidInt, $mailboxKey, $result);
        }
    }

    private function searchRecentSeen($mbox, string $mailboxKey, array &$result): void
    {
        $since = date('d-M-Y', strtotime('-' . self::RECENT_DAYS . ' days'));
        $uids = @imap_search($mbox, 'SINCE ' . $since . ' SEEN SUBJECT "PV"', SE_UID);
        if ($uids === false || $uids === []) return;

        foreach ($uids as $uid) {
            $uidInt = (int) $uid;
            if ($this->isAlreadyProcessed($uidInt, $mailboxKey)) continue;
            $this->processUid($mbox, $uidInt, $mailboxKey, $result);
        }
    }

    private function processUid($mbox, int $uid, string $mailboxKey, array &$result): void
    {
        try {
            if ($this->isAlreadyProcessed($uid, $mailboxKey)) return;

            $header = @imap_fetchheader($mbox, $uid, FT_UID);
            if ($header === false) return;

            $subject = $this->decodeSubject($header);
            $pvNumbers = $this->extractPvNumbers($subject);

            $bodyText = $this->fetchBodyText($mbox, $uid);

            if (empty($pvNumbers)) {
                $pvNumbers = $this->extractPvNumbersFromBody($bodyText);
            }

            if (empty($pvNumbers)) {
                $this->markProcessed($uid, '', $mailboxKey, false);
                $result['checked']++;
                return;
            }

            $isApproved = $this->isApprovalMessage($bodyText);

            error_log("PvEmailWatcher DEBUG: uid=$uid pvs=" . implode(',', $pvNumbers) . " subject='" . substr($subject, 0, 120) . "' bodyLen=" . strlen($bodyText) . " approved=" . ($isApproved ? 'YES' : 'NO'));

            if ($isApproved) {
                foreach ($pvNumbers as $pvNumber) {
                    $pv = $this->repository->getByNumberPv($pvNumber);
                    if ($pv !== null) {
                        $this->repository->updateItemsStatusByPvId($pv->id, self::APPROVED_TARGET_STATUS);
                        $result['approved']++;
                    }
                }
            }

            $primaryPv = $pvNumbers[0] ?? '';
            $this->markProcessed($uid, $primaryPv, $mailboxKey, $isApproved);

            $result['checked']++;

        } catch (\Throwable $e) {
            $errorMsg = 'Error processing UID ' . $uid . ': ' . $e->getMessage();
            error_log('PvEmailWatcher: ' . $errorMsg);
            $result['errors'][] = $errorMsg;
        }
    }

    private function decodeSubject(string $header): string
    {
        if (!preg_match('/^Subject:.*(?:\r?\n[ \t].*)*/mi', $header, $m)) {
            return '';
        }

        $raw = preg_replace('/^Subject:\s*/i', '', $m[0]);
        $raw = preg_replace('/\r?\n[\t ]+/', ' ', $raw);
        $raw = preg_replace('/ {2,}/', ' ', $raw);
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }

        $decoded = $this->decodeEncodedWords($raw);
        return $decoded !== '' ? $decoded : $raw;
    }

    private function decodeEncodedWords(string $raw): string
    {
        if (function_exists('imap_mime_header_decode')) {
            $parts = @imap_mime_header_decode($raw);
            if ($parts !== false && $parts !== []) {
                $decoded = trim((string) array_reduce($parts, static fn ($carry, $part) => $carry . $part->text, ''));
                if ($decoded !== '') {
                    return $decoded;
                }
            }
            return $raw;
        }

        if (!preg_match_all('/=\?[^?]+\?[QB]\?[^?]*\?=/i', $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return $raw;
        }

        $decoded = '';
        $cursor = 0;
        foreach ($matches[0] as [$token, $offset]) {
            $decoded .= substr($raw, $cursor, $offset - $cursor);
            $decoded .= $this->decodeSingleEncodedWord($token);
            $cursor = $offset + strlen($token);
        }
        $decoded .= substr($raw, $cursor);
        return trim($decoded);
    }

    private function decodeSingleEncodedWord(string $token): string
    {
        if (!preg_match('/^=\?([^?]+)\?([QB])\?([^?]*)\?=$/i', $token, $m)) {
            return $token;
        }

        $text = strtoupper($m[2]) === 'Q'
            ? $this->decodeQuotedPrintableWord($m[3])
            : (string) base64_decode($m[3], true);

        $charset = strtolower($m[1]);
        if ($charset !== '' && !in_array($charset, ['utf-8', 'us-ascii'], true) && function_exists('mb_convert_encoding')) {
            $text = mb_convert_encoding($text, 'UTF-8', $charset);
        }

        return $text;
    }

    private function decodeQuotedPrintableWord(string $payload): string
    {
        $text = str_replace('_', ' ', $payload);
        return (string) preg_replace_callback('/=([0-9A-Fa-f]{2})/', static fn ($h) => chr(hexdec($h[1])), $text);
    }

    private function extractPvNumber(string $subject): ?string
    {
        $numbers = $this->extractPvNumbers($subject);
        return $numbers[0] ?? null;
    }

    private function extractPvNumbers(string $subject): array
    {
        if (preg_match('/PVs?:?\s*([\d\s,;\/-]+)/i', $subject, $match)) {
            if (preg_match_all('/\b(\d{6})\b/', $match[1], $numMatches)) {
                return array_values(array_unique($numMatches[1]));
            }
        }

        if (preg_match_all('/PV\D*?(\d{6})/i', $subject, $matches)) {
            return array_values(array_unique($matches[1]));
        }

        return [];
    }

    private function extractPvNumbersFromBody(string $body): array
    {
        if (preg_match('/PVs?:?\s*([\d\s,;\/-]+)/i', $body, $match)) {
            if (preg_match_all('/\b(\d{6})\b/', $match[1], $numMatches)) {
                return array_values(array_unique($numMatches[1]));
            }
        }
        return [];
    }

    private function fetchBodyText($mbox, int $uid): string
    {
        $structure = @imap_fetchstructure($mbox, $uid, FT_UID);
        if (!$structure) return '';

        $plainParts = [];
        $htmlParts = [];

        $this->collectTextParts($mbox, $uid, $structure, '', $plainParts, $htmlParts);

        if (!empty($plainParts)) {
            $fullPlain = trim(implode("\n", $plainParts));
            if ($fullPlain !== '') {
                return $fullPlain;
            }
        }

        if (!empty($htmlParts)) {
            $fullHtml = implode("\n", $htmlParts);
            $cleanHtml = preg_replace('/<(?:br|div|p|tr|li)[\s\/]*>/i', "\n", $fullHtml);
            $decoded = html_entity_decode($cleanHtml, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $text = strip_tags($decoded);
            $text = preg_replace("/[\r\n]{2,}/", "\n", $text);
            return trim($text);
        }

        return '';
    }

    protected function getPartBody($mbox, int $uid, string $partNum): string|false
    {
        return @imap_fetchbody($mbox, $uid, $partNum, FT_UID);
    }

    private function collectTextParts($mbox, int $uid, object $part, string $partNum, array &$plainParts, array &$htmlParts): void
    {
        $isMultipart = (isset($part->type) && (int) $part->type === 1)
            || (isset($part->parts) && is_array($part->parts) && !empty($part->parts));

        if ($isMultipart) {
            foreach ($part->parts as $idx => $subPart) {
                $subNum = $partNum === '' ? (string) ($idx + 1) : $partNum . '.' . ($idx + 1);
                $this->collectTextParts($mbox, $uid, $subPart, $subNum, $plainParts, $htmlParts);
            }
            return;
        }

        $subtype = strtolower($part->subtype ?? '');
        $type = isset($part->type) ? (int) $part->type : 0;

        if ($type === 0 || in_array($subtype, ['plain', 'html'], true)) {
            $numToFetch = $partNum === '' ? '1' : $partNum;
            $rawBody = $this->getPartBody($mbox, $uid, $numToFetch);
            if ($rawBody === false || $rawBody === '') {
                return;
            }

            $decoded = $this->decodeBody($rawBody, $part->encoding ?? 0);
            $charset = $this->extractCharset($part);
            if ($charset !== '' && !in_array(strtolower($charset), ['utf-8', 'us-ascii'], true) && function_exists('mb_convert_encoding')) {
                $converted = @mb_convert_encoding($decoded, 'UTF-8', $charset);
                if ($converted !== false && $converted !== '') {
                    $decoded = $converted;
                }
            }

            if ($subtype === 'plain' || ($type === 0 && $subtype !== 'html')) {
                $plainParts[] = $decoded;
            } elseif ($subtype === 'html') {
                $htmlParts[] = $decoded;
            }
        }
    }

    private function extractCharset(object $part): string
    {
        if (isset($part->parameters) && is_array($part->parameters)) {
            foreach ($part->parameters as $param) {
                if (strtolower($param->attribute ?? '') === 'charset') {
                    return trim((string) ($param->value ?? ''));
                }
            }
        }
        return '';
    }

    private function isApprovalMessage(string $bodyText): bool
    {
        if (preg_match('/\b(reprovad[oa]s?|recusad[oa]s?|desaprovad[oa]s?|n[aã]o\s+aprovad[oa]s?|n[aã]o\s+aprovo|n[aã]o\s+autorizad[oa]s?|n[aã]o\s+autorizo)\b/ui', $bodyText)) {
            return false;
        }

        if (preg_match($this->getBodySearchPattern(), $bodyText)) {
            return true;
        }

        if (preg_match('/\b(aprovo|aprovamos|autorizad[oa]s?|autorizo|de\s+acordo)\b/ui', $bodyText)) {
            return true;
        }

        return false;
    }

    private function getBodySearchPattern(): string
    {
        return '/aprovad/i';
    }

    private function isAlreadyProcessed(int $uid, string $mailboxKey): bool
    {
        $sql = "SELECT 1 FROM email_processed WHERE uid = ? AND mailbox = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('is', $uid, $mailboxKey);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_row() !== null;
    }

    private function markProcessed(int $uid, string $pvNumber, string $mailboxKey, bool $approved = false): void
    {
        $approvedInt = $approved ? 1 : 0;
        try {
            $sql = "INSERT IGNORE INTO email_processed (uid, mailbox, pv_number, approved, processed_at) VALUES (?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            if ($stmt) {
                $stmt->bind_param('issi', $uid, $mailboxKey, $pvNumber, $approvedInt);
                $stmt->execute();
                return;
            }
        } catch (\Throwable) {
            // Se a coluna 'approved' ainda não existir na tabela email_processed
        }

        try {
            $sqlLegacy = "INSERT IGNORE INTO email_processed (uid, mailbox, pv_number, processed_at) VALUES (?, ?, ?, NOW())";
            $stmtLegacy = $this->conn->prepare($sqlLegacy);
            if ($stmtLegacy) {
                $stmtLegacy->bind_param('iss', $uid, $mailboxKey, $pvNumber);
                $stmtLegacy->execute();
            }
        } catch (\Throwable $e) {
            error_log('PvEmailWatcher markProcessed error: ' . $e->getMessage());
        }
    }

    private function decodeBody(string $body, int $encoding): string
    {
        switch ($encoding) {
            case 3: // BASE64 (PHP IMAP constant ENCBASE64 = 3)
                $clean = preg_replace('/\s+/', '', $body);
                $decoded = base64_decode($clean, true);
                return $decoded !== false ? $decoded : base64_decode($body);
            case 4: // QUOTED-PRINTABLE (PHP IMAP constant ENCQUOTEDPRINTABLE = 4)
                return quoted_printable_decode($body);
            case 0: // 7BIT (ENC7BIT = 0)
            case 1: // 8BIT (ENC8BIT = 1)
            case 2: // BINARY (ENCBINARY = 2)
            default:
                return $body;
        }
    }
}
