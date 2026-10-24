<?php

namespace Tests\Unit;

use App\Api\Services\PreventivaService;
use PHPUnit\Framework\TestCase;

/**
 * Testes do tipo 'adm' em Atividade Planejada (migration 067).
 * Adm = tarefa interna/logística: site de texto livre obrigatório,
 * sem OS, sem equipamento, sem SLA, status = ciclo Corretiva.
 */
class PreventivaAdmTypeTest extends TestCase
{
    private function makeService($mockRepo): PreventivaService
    {
        return new PreventivaService($mockRepo);
    }

    public function testPlanAdmCreatesRecordWithTipoAdm(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->expects($this->once())
            ->method('create')
            ->with($this->callback(function ($record) {
                return ($record['tipo'] ?? '') === 'adm'
                    && ($record['site'] ?? '') === 'Escritório Central'
                    && !isset($record['sla_days']);
            }))
            ->willReturn(50);
        $mockRepo->method('getPreventivaItemById')->willReturn([
            'id' => 50,
            'local' => 'Escritório Central',
            'tipo' => 'adm',
            'status' => 'Planejado',
        ]);

        $service = $this->makeService($mockRepo);
        $result = $service->planPreventiva([
            'tipo' => 'adm',
            'site' => 'Escritório Central',
            'data_planejada' => '2026-08-10',
            'equipe' => 'Fulano e Sicrano',
            'obs' => 'Vão levar o motor na empresa',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertSame('adm', $result['item']['tipo']);
    }

    public function testPlanAdmIgnoresSlaFields(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('create')->willReturn(51);
        $mockRepo->method('getPreventivaItemById')->willReturn([
            'id' => 51,
            'tipo' => 'adm',
            'status' => 'Planejado',
        ]);
        $mockRepo->expects($this->never())->method('setSlaGroupId');
        $mockRepo->expects($this->never())->method('createSlaCard');

        $service = $this->makeService($mockRepo);
        $result = $service->planPreventiva([
            'tipo' => 'adm',
            'site' => 'Depósito Central',
            'data_planejada' => '2026-08-10',
            'sla_days' => '5',
            'sla_include_saturday' => 1,
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertArrayNotHasKey('sla_days', $result);
    }

    public function testPlanPreventivaRejectsFreeTextSite(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('countMachinesForSite')->with('Alguma Firma Ltda')->willReturn(0);
        $mockRepo->expects($this->never())->method('create');

        $service = $this->makeService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Site inválido');

        $service->planPreventiva([
            'site' => 'Alguma Firma Ltda',
            'data_planejada' => '2026-08-10',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanPreventivaAcceptsRegisteredSite(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('countMachinesForSite')->with('RJOPIA')->willReturn(3);
        $mockRepo->expects($this->once())
            ->method('create')
            ->with($this->callback(function ($record) {
                return ($record['tipo'] ?? '') === 'preventiva';
            }))
            ->willReturn(52);
        $mockRepo->method('getPreventivaItemById')->willReturn([
            'id' => 52,
            'local' => 'RJOPIA',
            'tipo' => 'preventiva',
            'status' => 'Planejado',
        ]);

        $service = $this->makeService($mockRepo);
        $result = $service->planPreventiva([
            'site' => 'RJOPIA',
            'data_planejada' => '2026-08-12',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertSame('preventiva', $result['item']['tipo']);
    }

    public function testPlanThrowsForInvalidTipo(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->expects($this->never())->method('create');

        $service = $this->makeService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Tipo inválido');

        $service->planPreventiva([
            'tipo' => 'corretiva',
            'site' => 'RJOPIA',
            'data_planejada' => '2026-08-10',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testUpdateStatusAdmAllowsCorretivaStatusWithoutTransitions(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 60,
            'tipo' => 'adm',
            'site' => 'Escritório Central',
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(60, 'Concluído', $this->anything(), null, null);
        $mockRepo->method('getPreventivaItemById')->willReturn([
            'id' => 60,
            'tipo' => 'adm',
            'status' => 'Concluído',
        ]);

        $service = $this->makeService($mockRepo);
        $result = $service->updateStatus(60, 'Concluído', '', ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('status_updated', $result['action']);
    }

    public function testUpdateStatusAdmAllowsProjetoCleanUpAnytime(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 61,
            'tipo' => 'adm',
            'site' => 'Depósito',
            'status' => 'Em andamento',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(61, 'Projeto Clean up', $this->anything(), null, null);
        $mockRepo->method('getPreventivaItemById')->willReturn([
            'id' => 61,
            'tipo' => 'adm',
            'status' => 'Projeto Clean up',
        ]);

        $service = $this->makeService($mockRepo);
        $result = $service->updateStatus(61, 'Projeto Clean up', '', ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('status_updated', $result['action']);
    }

    public function testUpdateStatusAdmRejectsInvalidStatus(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 62,
            'tipo' => 'adm',
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->never())->method('updateStatus');

        $service = $this->makeService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Status inválido');

        $service->updateStatus(62, 'Status Inexistente', '', ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testDeleteReturnsRealTipoAdm(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 63,
            'tipo' => 'adm',
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())->method('delete')->with(63);
        $mockRepo->expects($this->never())->method('reconcilePreventivaSlaGroup');

        $service = $this->makeService($mockRepo);
        $result = $service->delete(63);

        $this->assertSame('deleted', $result['action']);
        $this->assertSame('adm', $result['tipo']);
    }
}
