<?php

namespace Tests\Unit;

use App\Api\Repositories\PreventivaDashboardRepository;
use App\Api\Services\PreventivaDashboardService;
use PHPUnit\Framework\TestCase;

class PreventivaDashboardServiceTest extends TestCase
{
    public function testFilteredTreemapTurnsGreenWhenPeriodMachinesCompleted(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'BGU02',
                'status' => 'Concluído',
                'qtd_executada' => 4,
                'machine_count' => 4,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats('2026-08-16', '2026-09-15', null);

        $this->assertCount(1, $stats['treemap']);
        $this->assertSame('BGU02', $stats['treemap'][0]['site']);
        $this->assertSame('#10B981', $stats['treemap'][0]['color']);
        $this->assertSame(100, $stats['treemap'][0]['pct']);
        $this->assertSame(0, $stats['treemap'][0]['restam']);
    }

    public function testFilteredTreemapIsRedWhenPeriodNeverExecuted(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'BGU02',
                'status' => 'Planejado',
                'qtd_executada' => null,
                'machine_count' => 4,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats('2026-07-16', '2026-08-15', null);

        $this->assertSame('#EF4444', $stats['treemap'][0]['color']);
        $this->assertSame(0, $stats['treemap'][0]['pct']);
        $this->assertSame(4, $stats['treemap'][0]['restam']);
    }

    public function testConsolidadoGeralIsYellowWhenSomePeriodPendingAndSomeCompleted(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'BGU02',
                'status' => 'Concluído',
                'qtd_executada' => 4,
                'machine_count' => 4,
            ],
            [
                'id' => 2,
                'site' => 'BGU02',
                'status' => 'Planejado',
                'qtd_executada' => null,
                'machine_count' => 4,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        // Consolidado geral: datas nulas / vazias
        $stats = $service->getStats(null, null, null);

        $this->assertCount(1, $stats['treemap']);
        $this->assertSame('#F59E0B', $stats['treemap'][0]['color']);
        $this->assertSame(4, $stats['treemap'][0]['qtd_sum']);
    }

    public function testConsolidadoGeralIsGreenWhenAllPeriodsCompleted(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'BGU02',
                'status' => 'Concluído',
                'qtd_executada' => 4,
                'machine_count' => 4,
            ],
            [
                'id' => 2,
                'site' => 'BGU02',
                'status' => 'Concluído',
                'qtd_executada' => 4,
                'machine_count' => 4,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats(null, null, null);

        $this->assertCount(1, $stats['treemap']);
        $this->assertSame('#10B981', $stats['treemap'][0]['color']);
    }

    public function testConsolidadoGeralIsRedWhenNeverExecuted(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'BGU02',
                'status' => 'Planejado',
                'qtd_executada' => null,
                'machine_count' => 4,
            ],
            [
                'id' => 2,
                'site' => 'BGU02',
                'status' => 'Planejado',
                'qtd_executada' => null,
                'machine_count' => 4,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats(null, null, null);

        $this->assertSame('#EF4444', $stats['treemap'][0]['color']);
    }
}
