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

    public function testKpiCardsReflectMachineCountsAcrossMultipleSites(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            // Site 1: 4 máquinas, 4 concluídas
            [
                'id' => 1,
                'site' => 'SITE_A',
                'status' => 'Concluído',
                'qtd_executada' => 4,
                'machine_count' => 4,
            ],
            // Site 2: 6 máquinas, 2 executadas (em andamento)
            [
                'id' => 2,
                'site' => 'SITE_B',
                'status' => 'Em Andamento',
                'qtd_executada' => 2,
                'machine_count' => 6,
            ],
            // Site 3: 8 máquinas, planejado (0 executadas)
            [
                'id' => 3,
                'site' => 'SITE_C',
                'status' => 'Planejado',
                'qtd_executada' => null,
                'machine_count' => 8,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats('2026-08-16', '2026-09-15', null);

        // Total de máquinas = 4 + 6 + 8 = 18
        $this->assertSame(18, $stats['total']);
        // Concluídas = 4 (Site A) + 2 (Site B) = 6
        $this->assertSame(6, $stats['completed']);
        // Em Andamento = 4 (Site B restantes)
        $this->assertSame(4, $stats['inProgress']);
        // Pendentes = 8 (Site C)
        $this->assertSame(8, $stats['pending']);

        // A soma deve bater perfeitamente: 6 + 4 + 8 = 18
        $this->assertSame($stats['total'], $stats['completed'] + $stats['inProgress'] + $stats['pending']);
    }

    public function testKpiCardsWhenQtdExecutadaIsNullForFullyCompletedSite(): void
    {
        $mockRepo = $this->createMock(PreventivaDashboardRepository::class);
        $mockRepo->method('listForDashboard')->willReturn([
            [
                'id' => 1,
                'site' => 'SITE_A',
                'status' => 'Concluído',
                'qtd_executada' => null,
                'machine_count' => 5,
            ],
        ]);

        $service = new PreventivaDashboardService($mockRepo);
        $stats = $service->getStats('2026-08-16', '2026-09-15', null);

        $this->assertSame(5, $stats['total']);
        $this->assertSame(5, $stats['completed']);
        $this->assertSame(0, $stats['inProgress']);
        $this->assertSame(0, $stats['pending']);
    }
}
