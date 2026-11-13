<?php

namespace App\Api\Services;

use App\Config\Database;
use App\Config\Env;
use App\Api\Repositories\SolicitacaoCompraRepository;

class SmEmailWatcherService extends PvEmailWatcherService
{
    private SolicitacaoCompraRepository $scRepo;

    public function __construct(?SolicitacaoCompraRepository $scRepo = null)
    {
        $this->scRepo = $scRepo ?? new SolicitacaoCompraRepository();
        $this->conn   = Database::connect();
    }

    public function process(): array
    {
        $result = [
            'checked'            => 0,
            'updated'            => 0,
            'errors'             => [],
            'mailboxes_searched' => 0,
        ];

        $host          = Env::get('IMAP_HOST', '');
        $port          = Env::get('IMAP_PORT', '993');
        $user          = Env::get('IMAP_USER', '');
        $pass          = Env::get('IMAP_PASS', '');
        $mailboxConfig = Env::get('IMAP_MAILBOX', 'INBOX');

        if ($host === '' || $user === '' || $pass === '') {
            $result['errors'][] = 'IMAP not configured';
            return $result;
        }

        $serverPrefix = $this->buildServerPrefix($host, $port);
        $mailboxKey   = $this->buildMailboxKey();

        $mbox = @imap_open($serverPrefix . 'INBOX', $user, $pass, OP_READONLY, 0);
        if ($mbox === false) {
            $result['errors'][] = 'IMAP connection failed: ' . imap_last_error();
            return $result;
        }

        $mailboxes = $this->resolveMailboxes($mbox, $serverPrefix, $mailboxConfig);
        $result['mailboxes_searched'] = count($mailboxes);

        foreach ($mailboxes as $fullPath) {
            if (!@imap_reopen($mbox, $fullPath)) continue;
            $this->processSmMailbox($mbox, $mailboxKey, $result);
        }

        imap_close($mbox);
        return $result;
    }

    private function processSmMailbox($mbox, string $mailboxKey, array &$result): void
    {
        $since   = date('d-M-Y', strtotime('-7 days'));
        $queries = [
            'UNSEEN SUBJECT "SM"',
            "SINCE {$since} SEEN SUBJECT \"SM\"",
        ];

        foreach ($queries as $query) {
            $uids = @imap_search($mbox, $query, SE_UID);
            if ($uids === false || $uids === []) continue;

            foreach ($uids as $uid) {
                $uidInt = (int) $uid;
                if ($this->isAlreadyProcessed($uidInt, $mailboxKey)) continue;
                $this->processSmUid($mbox, $uidInt, $mailboxKey, $result);
            }
        }
    }

    private function processSmUid($mbox, int $uid, string $mailboxKey, array &$result): void
    {
        try {
            $header  = @imap_fetchheader($mbox, $uid, FT_UID);
            if ($header === false) return;

            $subject  = $this->decodeSubject($header);
            $smNumber = $this->extractSmNumber($subject);

            $bodyText = $this->fetchBodyText($mbox, $uid);

            if ($smNumber === null) {
                $this->markProcessed($uid, '', $mailboxKey, false);
                $result['checked']++;
                return;
            }

            $isQuote = $this->isQuoteMessage($bodyText);

            if ($isQuote) {
                $sc = $this->scRepo->getByNumberSm($smNumber);
                if ($sc !== null) {
                    $updateService = new SolicitacaoCompraService($this->scRepo);
                    $updateService->updateField((int) $sc['id'], 'status', 'orcamento_recebido');
                    $updateService->updateField((int) $sc['id'], 'data_status', date('Y-m-d'));
                    $result['updated']++;
                }
            }

            $this->markProcessed($uid, $smNumber, $mailboxKey, $isQuote);
            $result['checked']++;

        } catch (\Throwable $e) {
            $error = 'SmWatcher UID ' . $uid . ': ' . $e->getMessage();
            error_log($error);
            $result['errors'][] = $error;
        }
    }

    public function extractSmNumber(string $subject): ?string
    {
        if (preg_match('/SM:?\s*(\d{6})/i', $subject, $m)) {
            return $m[1];
        }
        return null;
    }

    public function isQuoteMessage(string $bodyText): bool
    {
        return (bool) preg_match('/segue\s+or[cç]amento/iu', $bodyText);
    }
}
