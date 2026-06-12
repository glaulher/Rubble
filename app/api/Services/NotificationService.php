<?php

namespace App\Api\Services;

use App\Config\Env;
use App\Api\Helpers\MailerFactory;
use App\Api\Repositories\TicketRepository;
use App\Api\Repositories\CronRepository;
use App\Api\Entities\Ticket;


class NotificationService
{
    private TicketRepository $repository;
    private CronRepository $cronRepository;

    public function __construct(?TicketRepository $repository = null, ?CronRepository $cronRepository = null)
    {
        $this->repository = $repository ?? new TicketRepository();
        $this->cronRepository = $cronRepository ?? new CronRepository();
    }

    public function process(): array
    {
        if (!$this->shouldRun()) {
            return ['sent' => 0, 'message' => 'Notificação já executada hoje'];
        }

        $count = $this->sendNotifications();
        $this->updateLastExecution();

        if ($count === 0) {
            return ['sent' => 0, 'message' => 'Nenhuma atividade programada para amanhã'];
        }

        return ['sent' => $count, 'message' => "{$count} e-mail(s) de atividade programada enviado(s)"];
    }

    private function shouldRun(): bool
    {
        return $this->cronRepository->shouldRun();
    }

    private function sendNotifications(): int
    {
        $tickets = $this->repository->listScheduledToNotify();
        $sent = 0;

        foreach ($tickets as $ticket) {
            if ($this->sendEmail($ticket)) {
                $sent++;
            }
        }

        return $sent;
    }

    private function sendEmail(Ticket $ticket): bool
    {
        try {
            $mail = MailerFactory::create(15);

            $emails = explode(',', Env::get('NOTIFY_EMAILS', ''));

            foreach ($emails as $email) {
                $email = trim($email);

                if ($email !== '') {
                    $mail->addAddress($email);
                }
            }

            $mail->isHTML(true);

            $mail->Subject =
                "Atividade planejada para amanhã - " .
                ($ticket->local ?? 'Sem local') .
                " - " .
                ($ticket->equipment ?? 'Equipamento');

            $mail->Body = $this->buildEmailBody($ticket);

            if ($mail->send()) {
                $this->repository->markNotificationSent($ticket->id);
                return true;
            }

            error_log("NotificationService: falha no envio para OS {$ticket->os} (id={$ticket->id})");
            return false;
        } catch (\Exception $e) {
            error_log("NotificationService: erro ao enviar notificação OS {$ticket->os} (id={$ticket->id}): " . $e->getMessage());
            return false;
        }
    }

    private function buildEmailBody(Ticket $ticket): string
    {
        $e = fn(?string $v): string => htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8');

        return "
            <div style='font-family: Arial; padding:20px;'>
                <h2 style='color:#2563eb;'>Atividade planejada</h2>
                <table cellpadding='8' cellspacing='0' border='1'
                    style='border-collapse: collapse; width:100%;'>
                    <tr>
                        <td><b>OS</b></td>
                        <td>{$e($ticket->os)}</td>
                    </tr>
                    <tr>
                        <td><b>Data</b></td>
                        <td>{$e($ticket->plannedDate)}</td>
                    </tr>
                    <tr>
                        <td><b>Equipe</b></td>
                        <td>{$e($ticket->team)}</td>
                    </tr>
                    <tr>
                        <td><b>Status</b></td>
                        <td>{$e($ticket->status)}</td>
                    </tr>
                    <tr>
                        <td><b>Material</b></td>
                        <td>{$e($ticket->material)}</td>
                    </tr>
                    <tr>
                        <td><b>Observação</b></td>
                        <td>{$e($ticket->notes)}</td>
                    </tr>
                </table>
                <p style='margin-top:20px;color:#64748b;font-size:12px;'>
                    E-mail automático do sistema Rubble.
                </p>
            </div>
        ";
    }

    private function updateLastExecution(): void
    {
        $this->cronRepository->updateLastExecution();
    }
}