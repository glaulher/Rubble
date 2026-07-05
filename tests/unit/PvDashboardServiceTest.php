<?php

use PHPUnit\Framework\TestCase;
use App\Api\Repositories\PvDashboardRepository;
use App\Api\Services\PvDashboardService;

class PvDashboardServiceTest extends TestCase
{
    private function createMockRepo(): PvDashboardRepository
    {
        return $this->createMock(PvDashboardRepository::class);
    }

    public function testGetStatsPassesConstantsToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('statusCounts')->willReturn([]);
        $repo->method('pvByMonth')->willReturn([]);
        $repo->method('listLocations')->willReturn([]);
        $repo->method('totalPvCount')->willReturn(0);
        $repo->method('totalPvValue')->willReturn(0.0);
        $repo->method('topEquipment')->willReturn([]);

        $repo->expects($this->once())
            ->method('financialByMonth')
            ->with(null, null, null, PvDashboardService::FATURADO_STATUS, PvDashboardService::PREVISAO_EXCLUDE_STATUSES)
            ->willReturn([]);

        $repo->expects($this->once())
            ->method('topLocations')
            ->with(null, null, null, PvDashboardService::APPROVED_STATUS)
            ->willReturn([]);

        $repo->expects($this->once())
            ->method('topMaterials')
            ->with(null, null, null, PvDashboardService::MATERIAL_LPU_ORIGINS)
            ->willReturn([]);

        $repo->expects($this->once())
            ->method('topServices')
            ->with(null, null, null, PvDashboardService::SERVICE_LPU_ORIGINS)
            ->willReturn([]);

        $service = new PvDashboardService($repo);
        $service->getStats();
    }

    public function testGetStatsReturnsExpectedStructure(): void
    {
        $repo = $this->createMockRepo();

        $repo->method('statusCounts')->willReturn([
            ['status' => 'scm aprovado', 'count' => 5, 'totalValue' => '50000.00'],
            ['status' => 'aprovado aquisição/serviço', 'count' => 3, 'totalValue' => '20000.00'],
        ]);
        $repo->method('financialByMonth')->willReturn([
            ['mes' => '2026-01', 'faturado' => '30000.00', 'previsao' => '10000.00'],
        ]);
        $repo->method('topLocations')->willReturn([
            ['local' => 'RJOEN', 'totalValue' => '25000.00', 'pvCount' => 5],
        ]);
        $repo->method('topMaterials')->willReturn([
            ['descricao_lpu' => 'Parafuso', 'descricao' => '', 'quantidade' => '10', 'valorTotal' => '500.00'],
        ]);
        $repo->method('topServices')->willReturn([
            ['descricao_lpu' => 'Manutenção', 'descricao' => '', 'quantidade' => '2', 'valorTotal' => '3000.00'],
        ]);
        $repo->method('topEquipment')->willReturn([
            ['equipamento' => 'WM 01', 'local' => 'RSDDTC', 'totalValue' => '15000.00'],
        ]);
        $repo->method('pvByMonth')->willReturn([
            ['mes' => '2026-01', 'total' => 8],
        ]);
        $repo->method('listLocations')->willReturn(['RJOEN', 'RSDDTC']);
        $repo->method('totalPvCount')->willReturn(8);
        $repo->method('totalPvValue')->willReturn(70000.00);

        $service = new PvDashboardService($repo);
        $result = $service->getStats();

        $this->assertArrayHasKey('statusBreakdown', $result);
        $this->assertArrayHasKey('statusTotalPvCount', $result);
        $this->assertArrayHasKey('financialByMonth', $result);
        $this->assertArrayHasKey('topLocations', $result);
        $this->assertArrayHasKey('topMaterials', $result);
        $this->assertArrayHasKey('topServices', $result);
        $this->assertArrayHasKey('topEquipment', $result);
        $this->assertArrayHasKey('pvByMonth', $result);
        $this->assertArrayHasKey('locations', $result);
        $this->assertArrayHasKey('totals', $result);
        $this->assertEquals(8, $result['totals']['totalPvCount']);
        $this->assertEquals(50000.00, $result['totals']['totalFaturado']);
        $this->assertEquals(20000.00, $result['totals']['totalPrevisao']);
        $this->assertCount(5, $result['statusBreakdown']);
    }

    public function testGetStatsGrouping(): void
    {
        $repo = $this->createMockRepo();

        $repo->method('statusCounts')->willReturn([
            ['status' => 'scm aprovado', 'count' => 5, 'totalValue' => '50000.00'],
            ['status' => 'cancelado', 'count' => 2, 'totalValue' => '0.00'],
            ['status' => 'scm negado', 'count' => 1, 'totalValue' => '0.00'],
            ['status' => 'aprovado aquisição/serviço', 'count' => 3, 'totalValue' => '20000.00'],
            ['status' => 'aguardando envio', 'count' => 4, 'totalValue' => '8000.00'],
        ]);
        $repo->method('financialByMonth')->willReturn([]);
        $repo->method('topLocations')->willReturn([]);
        $repo->method('topMaterials')->willReturn([]);
        $repo->method('topServices')->willReturn([]);
        $repo->method('topEquipment')->willReturn([]);
        $repo->method('pvByMonth')->willReturn([]);
        $repo->method('listLocations')->willReturn([]);
        $repo->method('totalPvCount')->willReturn(15);
        $repo->method('totalPvValue')->willReturn(78000.00);

        $service = new PvDashboardService($repo);
        $result = $service->getStats();

        $breakdown = $result['statusBreakdown'];

        $scmAprovado = $breakdown[0];
        $this->assertEquals('scm_aprovado', $scmAprovado['key']);
        $this->assertEquals(50000.00, $scmAprovado['value']);
        $this->assertEquals(5, $scmAprovado['count']);

        $cancelados = $breakdown[1];
        $this->assertEquals('cancelados_negados', $cancelados['key']);
        $this->assertEquals(3, $cancelados['count']);
        $this->assertEquals('value', $cancelados['type']);

        $aprovadoExec = $breakdown[2];
        $this->assertEquals('aprovado_exec_aquisicao', $aprovadoExec['key']);
        $this->assertEquals(20000.00, $aprovadoExec['value']);
        $this->assertEquals(3, $aprovadoExec['count']);

        $semAprovacao = $breakdown[3];
        $this->assertEquals('sem_aprovacao', $semAprovacao['key']);
        $this->assertEquals(8000.00, $semAprovacao['value']);
        $this->assertEquals(4, $semAprovacao['count']);

        $totalGeral = $breakdown[4];
        $this->assertEquals('total_geral', $totalGeral['key']);
        $this->assertEquals(78000.00, $totalGeral['value']);
        $this->assertEquals(15, $totalGeral['count']);

        $this->assertEquals(50000.00, $result['totals']['totalFaturado']);
        $this->assertEquals(28000.00, $result['totals']['totalPrevisao']);
        $this->assertEquals(15, $result['totals']['totalPvCount']);
    }

    public function testIgnoresScmEnviado(): void
    {
        $repo = $this->createMockRepo();

        $repo->method('statusCounts')->willReturn([
            ['status' => 'scm enviado', 'count' => 3, 'totalValue' => '10000.00'],
            ['status' => 'scm aprovado', 'count' => 2, 'totalValue' => '30000.00'],
        ]);
        $repo->method('financialByMonth')->willReturn([]);
        $repo->method('topLocations')->willReturn([]);
        $repo->method('topMaterials')->willReturn([]);
        $repo->method('topServices')->willReturn([]);
        $repo->method('topEquipment')->willReturn([]);
        $repo->method('pvByMonth')->willReturn([]);
        $repo->method('listLocations')->willReturn([]);
        $repo->method('totalPvCount')->willReturn(5);
        $repo->method('totalPvValue')->willReturn(40000.00);

        $service = new PvDashboardService($repo);
        $result = $service->getStats();

        $this->assertEquals(5, $result['totals']['totalPvCount']);
        $this->assertEquals(30000.00, $result['totals']['totalFaturado']);
    }
}
