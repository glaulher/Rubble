<?php

namespace Tests\Unit;

use App\Api\Repositories\OsDashboardRepository;
use App\Api\Services\OsDashboardService;
use PHPUnit\Framework\TestCase;

class OsDashboardServiceTest extends TestCase
{
    private function createMockRepo(): OsDashboardRepository
    {
        return $this->createMock(OsDashboardRepository::class);
    }

    private function createService(?OsDashboardRepository $repo = null): OsDashboardService
    {
        return new OsDashboardService(
            $repo ?? $this->createMockRepo()
        );
    }

    public function testGetStatsReturnsCorrectTotals(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM 01', 'localidade' => 'Container 1', 'responsavel' => 'Claro', 'equipe' => 'João', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => 'obs', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Concluído', 'prioridade' => '1', 'local' => 'BMA', 'equipamento' => 'WM 02', 'localidade' => 'Container 2', 'responsavel' => 'Engemon', 'equipe' => 'Maria', 'data' => '2026-01-02', 'data_concluido' => '2026-01-03', 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => 'Compra Claro', 'data_prevista_conclusao' => null],
            ['id' => 3, 'status' => 'Em andamento', 'prioridade' => '3', 'local' => 'BMA', 'equipamento' => 'WM 03', 'localidade' => 'Container 3', 'responsavel' => '', 'equipe' => 'Pedro', 'data' => '2026-01-03', 'data_concluido' => null, 'obs' => '', 'os' => 'OS3', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => '2026-01-10'],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertSame(3, $stats['total']);
        $this->assertSame(2, $stats['pending']);
        $this->assertSame(1, $stats['completed']);
        $this->assertSame(1, $stats['inProgress']);
    }

    public function testGetStatsGroupsResponsibilityCounts(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'responsavel' => 'Claro', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'prioridade' => '0', 'equipe' => 'J', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Concluído', 'responsavel' => 'Claro', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'prioridade' => '0', 'equipe' => 'J', 'data' => '2026-01-01', 'data_concluido' => '2026-01-02', 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 3, 'status' => 'Pendente', 'responsavel' => 'Engemon', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'prioridade' => '0', 'equipe' => 'J', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS3', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertArrayHasKey('Claro', $stats['responsibilityCounts']);
        $this->assertArrayHasKey('Engemon', $stats['responsibilityCounts']);
        $this->assertSame(2, $stats['responsibilityCounts']['Claro']['total']);
        $this->assertSame(1, $stats['responsibilityCounts']['Claro']['completed']);
        $this->assertSame(1, $stats['responsibilityCounts']['Engemon']['pending']);
    }

    public function testGetStatsPriorityBreakdown(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Pendente', 'prioridade' => '0-A', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 3, 'status' => 'Concluído', 'prioridade' => '3', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => '2026-01-02', 'obs' => '', 'os' => 'OS3', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertSame(1, $stats['priorityBreakdown']['0']);
        $this->assertSame(1, $stats['priorityBreakdown']['0-A']);
        $this->assertSame(1, $stats['priorityBreakdown']['3']);
        $this->assertSame(1, $stats['completedPriorityBreakdown']['3']);
        $this->assertSame(0, $stats['completedPriorityBreakdown']['0']);
    }

    public function testGetStatsEmAndamentoOS(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Em andamento', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => 'João', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => 'test obs', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => '2026-01-10'],
            ['id' => 2, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertCount(1, $stats['emAndamentoOS']);
        $this->assertSame('BMA', $stats['emAndamentoOS'][0]['local']);
        $this->assertSame('João', $stats['emAndamentoOS'][0]['equipe']);
        $this->assertSame('2026-01-10', $stats['emAndamentoOS'][0]['data_prevista_conclusao']);
    }

    public function testGetStatsResponsabilidadeClaro(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => 'Claro', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => 'Engemon', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertCount(1, $stats['responsabilidadeClaroOS']);
        $this->assertSame('OS1', $stats['responsabilidadeClaroOS'][0]['os']);
    }

    public function testGetStatsTopTechnicians(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => 'João', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => 'João', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 3, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => 'Maria', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS3', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertArrayHasKey('João', $stats['topTechnicians']);
        $this->assertSame(2, $stats['topTechnicians']['João']);
        $this->assertSame(1, $stats['topTechnicians']['Maria']);
    }

    public function testGetStatsEmptyData(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertSame(0, $stats['total']);
        $this->assertSame(0, $stats['pending']);
        $this->assertSame(0, $stats['completed']);
        $this->assertSame(0, $stats['inProgress']);
        $this->assertEmpty($stats['responsibilityCounts']);
        $this->assertEmpty($stats['topTechnicians']);
        $this->assertEmpty($stats['evolution']);
    }

    public function testGetStatsEvolutionData(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAllForDashboard')->willReturn([
            ['id' => 1, 'status' => 'Pendente', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => null, 'obs' => '', 'os' => 'OS1', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
            ['id' => 2, 'status' => 'Concluído', 'prioridade' => '0', 'local' => 'BMA', 'equipamento' => 'WM', 'localidade' => 'C1', 'responsavel' => '', 'equipe' => '', 'data' => '2026-01-01', 'data_concluido' => '2026-01-03', 'obs' => '', 'os' => 'OS2', 'tipo' => 'corretiva', 'step' => null, 'data_prevista_conclusao' => null],
        ]);

        $service = $this->createService($repo);
        $stats = $service->getStats();

        $this->assertNotEmpty($stats['evolution']);
        $firstDay = $stats['evolution'][0];
        $this->assertSame('2026-01-01', $firstDay['date']);
        $this->assertSame(2, $firstDay['count']);
    }

    public function testPriorityLabelsAndColorsAreDefined(): void
    {
        $labels = OsDashboardService::priorityLabels();
        $colors = OsDashboardService::priorityColors();

        $this->assertArrayHasKey('0', $labels);
        $this->assertArrayHasKey('0-A', $labels);
        $this->assertArrayHasKey('5', $labels);
        $this->assertArrayHasKey('0', $colors);
        $this->assertStringStartsWith('#', $colors['0']);
    }

    public function testStatusColorsAreDefined(): void
    {
        $colors = OsDashboardService::statusColors();

        $this->assertArrayHasKey('pendente', $colors);
        $this->assertArrayHasKey('concluido', $colors);
        $this->assertArrayHasKey('em andamento', $colors);
    }
}
