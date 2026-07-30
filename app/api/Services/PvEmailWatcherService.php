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
        ];

        $host = Env::get('IMAP_HOST', '');
        $port = Env::get('IMAP_PORT', '993');
        $user = Env::get('IMAP_USER', '');
        $pass = Env::get('IMAP_PASS', '');
        $mailbox = Env::get('IMAP_MAILBOX', 'INBOX');

        if ($host === '' || $user === '' || $pass === '') {
            $result['errors'][] = 'IMAP not configured';
            return $result;
        }

        $mailboxPath = '{' . $host . ':' . $port . '/imap/ssl}' . $mailbox;

        $mbox = @imap_open($mailboxPath, $user, $pass, OP_READONLY, 0);
        if ($mbox === false) {
            $result['errors'][] = 'IMAP connection failed: ' . imap_last_error();
            return $result;
        }

        $uids = @imap_search($mbox, 'UNSEEN SUBJECT "PV:"', SE_UID);
        if ($uids === false || $uids === []) {
            imap_close($mbox);
            return $result;
        }

        foreach ($uids as $uid) {
            try {
                $header = @imap_fetchheader($mbox, $uid, FT_UID);
                if ($header === false) continue;

                $subject = '';
                if (preg_match('/^Subject:\s*(.+)$/mi', $header, $m)) {
                    $subject = iconv_mime_decode($m[1], 0, 'UTF-8');
                }

                if (!preg_match('/PV(\d{6})/', $subject, $pvMatch)) {
                    continue;
                }
                $pvNumber = $pvMatch[1];

                if ($this->isAlreadyProcessed($uid)) {
                    continue;
                }

                $body = @imap_fetchbody($mbox, $uid, 1, FT_UID | FT_PEEK);
                if ($body === false) {
                    $body = @imap_fetchbody($mbox, $uid, 1, FT_UID);
                }

                $bodyText = '';
                if ($body !== false) {
                    $encoding = @imap_fetchstructure($mbox, $uid, FT_UID);
                    $bodyText = $this->decodeBody($body, $encoding?->encoding ?? 0);
                }

                if (!preg_match('/aprovad/i', $bodyText)) {
                    $this->markProcessed($uid, $pvNumber);
                    $result['checked']++;
                    continue;
                }

                $pv = $this->repository->getByNumberPv($pvNumber);
                if ($pv !== null) {
                    $this->repository->updateItemsStatusByPvId($pv->id, self::APPROVED_TARGET_STATUS);
                    $result['approved']++;
                }

                $this->markProcessed($uid, $pvNumber);
                $result['checked']++;

            } catch (\Throwable $e) {
                $errorMsg = 'Error processing UID ' . $uid . ': ' . $e->getMessage();
                error_log('PvEmailWatcher: ' . $errorMsg);
                $result['errors'][] = $errorMsg;
            }
        }

        imap_close($mbox);
        return $result;
    }

    private function isAlreadyProcessed(int $uid): bool
    {
        $sql = "SELECT 1 FROM email_processed WHERE uid = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_row() !== null;
    }

    private function markProcessed(int $uid, string $pvNumber): void
    {
        $sql = "INSERT IGNORE INTO email_processed (uid, pv_number, processed_at) VALUES (?, ?, NOW())";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('is', $uid, $pvNumber);
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
