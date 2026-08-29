<?php

namespace Tests\Unit;

use App\Api\Services\PreventivaService;
use PHPUnit\Framework\TestCase;

class PreventivaServiceTest extends TestCase
{
    public function testClassExists(): void
    {
        $this->assertTrue(class_exists(PreventivaService::class));
    }

    public function testUpdateStatusWithoutDateDoesNotPassDataPlanejada(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Cancelado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything());

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', 'reagendado', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testUpdateStatusWithDatePassesDataPlanejadaToRepository(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything(), '2026-08-15');

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', '', ['nome' => 'Test', 'role' => 'admin'], '2026-08-15');
    }

    public function testUpdateStatusThrowsOnInvalidTransition(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Concluído',
            'obs' => '',
        ]);

        $service = new PreventivaService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Transição inválida');
        $service->updateStatus(1, 'Cancelado', '', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testDeleteMethodExists(): void
    {
        $this->assertTrue(method_exists(PreventivaService::class, 'delete'));
    }

    public function testEnrichItemCalculatesSlaProgressWithGroupId(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 10,
            'site' => 'RJOPIA',
            'status' => 'Planejado',
            'obs' => '',
            'sla_days' => 3,
            'sla_group_id' => 10,
        ]);
        $mockRepo->method('countMachinesForSite')->with('RJOPIA')->willReturn(8);
        $mockRepo->method('sumQtdForGroup')->with(10)->willReturn(3);
        $mockRepo->method('getPreventivaItemById')->with(10)->willReturn([
            'id' => 10,
            'local' => 'RJOPIA',
            'status' => 'Em Andamento',
            'qtd_executada' => 1,
            'sla_days' => 3,
            'sla_group_id' => 10,
            'machine_count' => 8,
        ]);

        $service = new PreventivaService($mockRepo);
        $result = $service->updateStatus(10, 'Em Andamento', 'iniciando', ['nome' => 'Admin', 'role' => 'admin'], null, 1);

        $this->assertSame(3, $result['item']['sla_feito']);
        $this->assertSame(5, $result['item']['sla_restam']);
        $this->assertSame(38, $result['item']['sla_pct']);
    }

    public function testUpdateStatusEnforcesSlaGroupTotalAgainstSiteMachines(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 11,
            'site' => 'RJOPIA',
            'status' => 'Planejado',
            'obs' => '',
            'sla_days' => 3,
            'sla_group_id' => 10,
        ]);
        $mockRepo->method('countMachinesForSite')->with('RJOPIA')->willReturn(8);
        // Outros cards já somam 7 máquinas
        $mockRepo->method('sumQtdForGroup')->with(10, 11)->willReturn(7);

        $service = new PreventivaService($mockRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Total do SLA (9) excede 8 máquinas do site. Restam 1.');

        $service->updateStatus(11, 'Em Andamento', '', ['nome' => 'Admin', 'role' => 'admin'], null, 2);
    }
}
