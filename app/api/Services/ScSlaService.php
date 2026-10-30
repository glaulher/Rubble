<?php

namespace App\Api\Services;

use App\Api\Helpers\MailerFactory;
use App\Api\Repositories\SolicitacaoCompraRepository;
use App\Config\Env;
use PHPMailer\PHPMailer\PHPMailer;

class ScSlaService
{
    private SolicitacaoCompraRepository $repository;

    /** @var \Closure */
    private \Closure $mailerFactory;

    public function __construct(
        ?SolicitacaoCompraRepository $repository = null,
        ?callable $mailerFactory = null
    ) {
        $this->repository = $repository ?? new SolicitacaoCompraRepository();
        $this->mailerFactory = \Closure::fromCallable(
            $mailerFactory ?? static fn () => MailerFactory::create(15)
        );
    }

    /**
     * @return array{sent: int, message: string}
     */
    public function process(?string $today = null): array
    {
        $today ??= date('Y-m-d');

        $sent = 0;
        foreach ($this->repository->listWithSla() as $row) {
            if (!self::shouldNotify($row, $today)) {
                continue;
            }

            if (!$this->sendEmail($row, $today)) {
                continue;
            }

            $this->repository->markSlaNotified((int) $row['id'], $row['data_status'] ?? null);
            $sent++;
        }

        return [
            'sent' => $sent,
            'message' => $sent === 0
                ? 'Nenhuma solicitação de compra fora do SLA'
                : "{$sent} e-mail(s) de SLA de SC enviado(s)",
        ];
    }

    public static function shouldNotify(array $row, string $today): bool
    {
        if (SolicitacaoCompraService::overdueDays($row, $today) <= 0) {
            return false;
        }

        $notifiedAt = $row['sla_notificado_em'] ?? null;
        if ($notifiedAt === null || $notifiedAt === '') {
            return true;
        }

        if (substr((string) $notifiedAt, 0, 10) < $today) {
            return true;
        }

        return ($row['sla_notificado_data_status'] ?? null) !== ($row['data_status'] ?? null);
    }

    public static function buildEmailBody(array $row, string $today): string
    {
        $overdue = SolicitacaoCompraService::overdueDays($row, $today);
        $elapsed = self::elapsedDays($row, $today);

        $statusKey = (string) ($row['status'] ?? '');
        $status = SolicitacaoCompraService::STATUS_LABELS[$statusKey] ?? $statusKey;

        $lines = [
            'Título' => (string) ($row['titulo_email'] ?? ''),
            'Site' => (string) ($row['site'] ?? ''),
            'Status' => $status,
            'Data do status' => self::formatDate($row['data_status'] ?? null),
            'Dias parados' => $elapsed . ' dia(s)',
            'SLA' => ($row['sla_dias'] ?? '') . ' dia(s)',
            'Dias de atraso' => $overdue . ' dia(s)',
        ];

        $rows = '';
        foreach ($lines as $label => $value) {
            $rows .= '<tr>'
                . '<td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;">'
                . htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
                . '</td>'
                . '<td style="padding:6px 12px;border:1px solid #e2e8f0;">'
                . htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                . '</td>'
                . '</tr>';
        }

        return '<p>A solicitação de compra abaixo está sem atualização de status além do SLA configurado.</p>'
            . '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">'
            . $rows
            . '</table>';
    }

    private function sendEmail(array $row, string $today): bool
    {
        try {
            $mail = ($this->mailerFactory)();

            $overdue = SolicitacaoCompraService::overdueDays($row, $today);
            $title = (string) ($row['titulo_email'] ?? 'Sem título');
            $subject = "SC sem atualização há {$overdue} dia(s) - {$title}";

            // Fakes injetados em teste só implementam send(); o mailer real é configurado aqui.
            if ($mail instanceof PHPMailer) {
                foreach (self::recipients('SC_SLA_EMAILS') as $email) {
                    $mail->addAddress($email);
                }
                foreach (self::recipients('SC_SLA_EMAILS_CC') as $email) {
                    $mail->addCC($email);
                }

                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body = self::buildEmailBody($row, $today);
            }

            return (bool) $mail->send();
        } catch (\Throwable $e) {
            error_log('Falha ao enviar alerta de SLA da SC ' . ($row['id'] ?? '?') . ': ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @return string[]
     */
    private static function recipients(string $key): array
    {
        $emails = [];
        foreach (explode(',', (string) Env::get($key, '')) as $email) {
            $email = trim($email);
            if ($email !== '') {
                $emails[] = $email;
            }
        }

        return $emails;
    }

    private static function elapsedDays(array $row, string $today): int
    {
        $statusTs = strtotime((string) ($row['data_status'] ?? ''));
        $todayTs = strtotime($today);

        if ($statusTs === false || $todayTs === false) {
            return 0;
        }

        return max(0, (int) round(($todayTs - $statusTs) / 86400));
    }

    private static function formatDate(?string $value): string
    {
        if ($value === null || $value === '') {
            return '-';
        }

        $ts = strtotime($value);

        return $ts === false ? (string) $value : date('d/m/Y', $ts);
    }
}
