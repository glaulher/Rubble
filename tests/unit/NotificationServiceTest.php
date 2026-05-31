<?php

namespace Tests\Unit;

use App\Api\Entities\Ticket;
use App\Api\Repositories\TicketRepository;
use App\Api\Repositories\CronRepository;
use App\Api\Services\NotificationService;
use PHPUnit\Framework\TestCase;

class NotificationServiceTest extends TestCase
{
    public function testProcessReturnsEarlyWhenAlreadyExecutedToday(): void
    {
        $ticketRepo = $this->createMock(TicketRepository::class);
        $cronRepo = $this->createMock(CronRepository::class);

        $cronRepo->method('shouldRun')->willReturn(false);

        $service = new NotificationService($ticketRepo, $cronRepo);
        $result = $service->process();

        $this->assertSame(['sent' => 0, 'message' => 'Notificação já executada hoje'], $result);
    }

    public function testProcessReturnsZeroWhenNoScheduledTickets(): void
    {
        $ticketRepo = $this->createMock(TicketRepository::class);
        $cronRepo = $this->createMock(CronRepository::class);

        $cronRepo->method('shouldRun')->willReturn(true);
        $ticketRepo->method('listScheduledToNotify')->willReturn([]);

        $service = new NotificationService($ticketRepo, $cronRepo);
        $result = $service->process();

        $this->assertSame(['sent' => 0, 'message' => 'Nenhuma atividade programada para amanhã'], $result);
    }

    public function testProcessUpdatesLastExecutionAfterAttempt(): void
    {
        $ticketRepo = $this->createMock(TicketRepository::class);
        $cronRepo = $this->createMock(CronRepository::class);

        $cronRepo->method('shouldRun')->willReturn(true);
        $ticketRepo->method('listScheduledToNotify')->willReturn([]);
        $cronRepo->expects($this->once())->method('updateLastExecution');

        $service = new NotificationService($ticketRepo, $cronRepo);
        $service->process();
    }

    public function testProcessDoesNotUpdateExecutionWhenAlreadyRan(): void
    {
        $ticketRepo = $this->createMock(TicketRepository::class);
        $cronRepo = $this->createMock(CronRepository::class);

        $cronRepo->method('shouldRun')->willReturn(false);
        $cronRepo->expects($this->never())->method('updateLastExecution');

        $service = new NotificationService($ticketRepo, $cronRepo);
        $service->process();
    }
}
