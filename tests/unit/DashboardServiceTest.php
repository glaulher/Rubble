<?php

namespace Tests\Unit;

use App\Api\Repositories\DashboardRepository;
use App\Api\Services\DashboardService;
use PHPUnit\Framework\TestCase;

class DashboardServiceTest extends TestCase
{
    private function createMockRepo(): DashboardRepository
    {
        return $this->createMock(DashboardRepository::class);
    }

    // --- getStats ---

    public function testGetStatsReturnsAllExpectedKeys(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('statusCounts')->willReturn([
            'pendente' => 5,
            'planejado' => 3,
            'concluído' => 10,
        ]);
        $repo->method('topSites')->willReturn([
            ['local' => 'Site A', 'problemas' => 8],
        ]);
        $repo->method('topMachines')->willReturn([
            ['equipamento' => 'Machine-1', 'local' => 'Site A', 'total_registros' => 12],
        ]);
        $repo->method('topTechnicians')->willReturn([
            ['equipe' => 'Tech A', 'atendimentos' => 15],
        ]);
        $repo->method('avgResolutionByMachine')->willReturn([
            ['equipamento' => 'Machine-1', 'local' => 'Site A', 'dias_medio' => '3.5'],
        ]);
        $repo->method('avgResolutionByMonth')->willReturn([
            ['mes' => '2026-05', 'dias_medio' => '4.2'],
        ]);
        $repo->method('avgResolutionByTechnician')->willReturn([
            ['equipe' => 'Tech A', 'dias_medio' => '2.8'],
        ]);

        $service = new DashboardService($repo);
        $result = $service->getStats();

        $this->assertArrayHasKey('statusCounts', $result);
        $this->assertArrayHasKey('totalTickets', $result);
        $this->assertArrayHasKey('topSites', $result);
        $this->assertArrayHasKey('topMachines', $result);
        $this->assertArrayHasKey('topTechnicians', $result);
        $this->assertArrayHasKey('resolutionByMachine', $result);
        $this->assertArrayHasKey('resolutionByMonth', $result);
        $this->assertArrayHasKey('resolutionByTechnician', $result);

        $this->assertSame(18, $result['totalTickets']);
        $this->assertSame(10, $result['statusCounts']['completed']);
        $this->assertSame(5, $result['statusCounts']['pending']);
        $this->assertSame(3, $result['statusCounts']['planned']);
        $this->assertCount(1, $result['topSites']);
        $this->assertSame('Tech A', $result['topTechnicians'][0]['equipe']);
    }

    public function testGetStatsWithEmptyData(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('statusCounts')->willReturn([]);
        $repo->method('topSites')->willReturn([]);
        $repo->method('topMachines')->willReturn([]);
        $repo->method('topTechnicians')->willReturn([]);
        $repo->method('avgResolutionByMachine')->willReturn([]);
        $repo->method('avgResolutionByMonth')->willReturn([]);
        $repo->method('avgResolutionByTechnician')->willReturn([]);

        $service = new DashboardService($repo);
        $result = $service->getStats();

        $this->assertSame(0, $result['totalTickets']);
        $this->assertSame([], $result['topSites']);
        $this->assertSame([], $result['resolutionByMonth']);
    }
}
