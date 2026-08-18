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
        $uids = @imap_search($mbox, 'UNSEEN SUBJECT "PV:"', SE_UID);
        if ($uids === false || $uids === []) return;

        foreach ($uids as $uid) {
            $this->processUid($mbox, (int) $uid, $mailboxKey, $result);
        }
    }

    private function searchRecentSeen($mbox, string $mailboxKey, array &$result): void
    {
        $since = date('d-M-Y', strtotime('-' . self::RECENT_DAYS . ' days'));
        $uids = @imap_search($mbox, 'SINCE ' . $since . ' SEEN SUBJECT "PV:"', SE_UID);
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
            $header = @imap_fetchheader($mbox, $uid, FT_UID);
            if ($header === false) return;

            $subject = $this->decodeSubject($header);

            $pvNumber = $this->extractPvNumber($subject);
            if ($pvNumber === null) return;

            if ($this->isAlreadyProcessed($uid, $mailboxKey)) return;

            $bodyText = $this->fetchBodyText($mbox, $uid);
            $isApproved = preg_match($this->getBodySearchPattern(), $bodyText) === 1;

            if ($isApproved) {
                $pv = $this->repository->getByNumberPv($pvNumber);
                if ($pv !== null) {
                    $this->repository->updateItemsStatusByPvId($pv->id, self::APPROVED_TARGET_STATUS);
                    $result['approved']++;
                }
            }

            $this->markProcessed($uid, $pvNumber, $mailboxKey);
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
        if (!preg_match('/PV:?\s*(\d{6})/', $subject, $pvMatch)) {
            return null;
        }
        return $pvMatch[1];
    }

    private function fetchBodyText($mbox, int $uid): string
    {
        $structure = @imap_fetchstructure($mbox, $uid, FT_UID);
        if (!$structure) return '';

        $text = '';

        if (isset($structure->parts) && count($structure->parts) > 0) {
            for ($i = 1; $i <= count($structure->parts); $i++) {
                $partIdx = $i - 1;
                $part = $structure->parts[$partIdx];
                $subtype = strtolower($part->subtype ?? '');

                if (in_array($subtype, ['plain', 'html'], true)) {
                    $body = @imap_fetchbody($mbox, $uid, $i, FT_UID);
                    if ($body !== false) {
                        $text .= $this->decodeBody($body, $part->encoding ?? 0) . "\n";
                    }
                }

                if ($this->hasSubparts($part)) {
                    $text .= $this->fetchSubparts($mbox, $uid, $i, $part);
                }
            }
        } else {
            $body = @imap_fetchbody($mbox, $uid, 1, FT_UID);
            if ($body !== false) {
                $text = $this->decodeBody($body, $structure->encoding ?? 0);
            }
        }

        return $text;
    }

    private function hasSubparts(object $part): bool
    {
        return isset($part->parts) && count($part->parts) > 0;
    }

    private function fetchSubparts($mbox, int $uid, int $parentPart, object $part): string
    {
        $text = '';
        foreach ($part->parts as $subIdx => $subPart) {
            $partNum = $parentPart . '.' . ($subIdx + 1);
            $subtype = strtolower($subPart->subtype ?? '');
            if (in_array($subtype, ['plain', 'html'], true)) {
                $body = @imap_fetchbody($mbox, $uid, $partNum, FT_UID);
                if ($body !== false) {
                    $text .= $this->decodeBody($body, $subPart->encoding ?? 0) . "\n";
                }
            }
        }
        return $text;
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

    private function markProcessed(int $uid, string $pvNumber, string $mailboxKey): void
    {
        $sql = "INSERT IGNORE INTO email_processed (uid, mailbox, pv_number, processed_at) VALUES (?, ?, ?, NOW())";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('iss', $uid, $mailboxKey, $pvNumber);
        $stmt->execute();
    }

    private function decodeBody(string $body, int $encoding): string
    {
        switch ($encoding) {
            case 1:
                return base64_decode($body) ?: '';
            case 2:
                return quoted_printable_decode($body);
            case 3:
                return base64_decode($body) ?: '';
            case 4:
                return quoted_printable_decode($body);
            default:
                return $body;
        }
    }
}
