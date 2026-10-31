<?php

namespace Tests\Unit;

use App\Api\Repositories\SolicitacaoCompraRepository;
use App\Api\Services\ScSlaService;
use PHPUnit\Framework\TestCase;

class ScSlaServiceTest extends TestCase
{
    private function overdueRow(array $over = []): array
    {
        return array_merge([
            'id' => 1,
            'titulo_email' => 'Cotação filtros',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'sla_dias' => 3,
            'data_status' => '2026-10-20',
            'sla_notificado_em' => null,
            'sla_notificado_data_status' => null,
        ], $over);
    }

    public function testShouldNotifyWhenNeverNotified(): void
    {
        $this->assertTrue(ScSlaService::shouldNotify($this->overdueRow(), '2026-10-30'));
    }

    public function testShouldNotNotifyTwiceOnSameDay(): void
    {
        $row = $this->overdueRow([
            'sla_notificado_em' => '2026-10-30 09:00:00',
            'sla_notificado_data_status' => '2026-10-20',
        ]);

        $this->assertFalse(ScSlaService::shouldNotify($row, '2026-10-30'));
    }

    public function testNotifiesAgainWhenStatusDateChanged(): void
    {
        $row = $this->overdueRow([
            'sla_notificado_em' => '2026-10-30 09:00:00',
            'sla_notificado_data_status' => '2026-10-15',
        ]);

        $this->assertTrue(ScSlaService::shouldNotify($row, '2026-10-30'));
    }

    public function testDoesNotNotifyWhenNotOverdue(): void
    {
        $row = $this->overdueRow(['data_status' => '2026-10-29']);

        $this->assertFalse(ScSlaService::shouldNotify($row, '2026-10-30'));
    }

    public function testBuildEmailBodyCarriesTitleAndDelay(): void
    {
        $body = ScSlaService::buildEmailBody($this->overdueRow(), '2026-10-30');

        $this->assertStringContainsString('Cotação filtros', $body);
        $this->assertStringContainsString('10 dia', $body);
    }

    public function testProcessKeepsGoingWhenMarkingFails(): void
    {
        $repo = $this->createMock(SolicitacaoCompraRepository::class);
        $repo->method('listWithSla')->willReturn([
            $this->overdueRow(['id' => 1]),
            $this->overdueRow(['id' => 2]),
        ]);
        $repo->method('markSlaNotified')->willReturnCallback(
            function (int $id): void {
                if ($id === 1) {
                    throw new \RuntimeException('deadlock');
                }
            }
        );

        $service = new ScSlaService($repo, fn () => new class {
            public function send(): bool
            {
                return true;
            }
        });

        $result = $service->process('2026-10-30');

        $this->assertSame(2, $result['sent']);
    }

    public function testProcessSendsOnlyEligibleAndMarksNotified(): void
    {
        $repo = $this->createMock(SolicitacaoCompraRepository::class);
        $repo->method('listWithSla')->willReturn([
            $this->overdueRow(['id' => 1]),
            $this->overdueRow(['id' => 2, 'data_status' => '2026-10-29']), // no limite
        ]);
        $repo->expects($this->once())->method('markSlaNotified')->with(1, '2026-10-20');

        $sent = 0;
        $service = new ScSlaService($repo, function () use (&$sent) {
            $sent++;

            return new class {
                public function send(): bool
                {
                    return true;
                }
            };
        });

        $result = $service->process('2026-10-30');

        $this->assertSame(1, $result['sent']);
        $this->assertSame(1, $sent);
    }
}
