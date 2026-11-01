<?php

namespace Tests\Unit;

use App\Api\Repositories\PvRepository;
use App\Api\Repositories\ScmRepository;
use App\Api\Services\PreventiveCycleService;
use App\Api\Services\PvService;
use App\Api\Services\ScmService;
use App\Api\Services\TicketService;
use PHPUnit\Framework\TestCase;

class PvTicketSyncTest extends TestCase
{
    private function createPvService(?PvRepository $repo = null, ?TicketService $ticketService = null): PvService
    {
        return new PvService(
            $repo ?? $this->createMock(PvRepository::class),
            $ticketService ?? $this->createMock(TicketService::class)
        );
    }

    public function testUpdateItemsByWorstStatusSyncsTicketsWhenScmAprovado(): void
    {
        $repo = $this->createMock(PvRepository::class);
        $repo->expects($this->once())
            ->method('updateItemsByWorstStatus')
            ->with(123, 'SCM aprovado')
            ->willReturn(true);

        $repo->expects($this->once())
            ->method('getWorstStatus')
            ->with(123)
            ->willReturn('SCM aprovado');

        $repo->expects($this->once())
            ->method('syncTicketsStatusByPvId')
            ->with(123, 'Concluído')
            ->willReturn(2);

        $service = $this->createPvService($repo);
        $result = $service->updateItemsByWorstStatus(123, 'SCM aprovado');

        $this->assertTrue($result);
    }

    public function testUpdateItemsByWorstStatusDoesNotSyncTicketsWhenNotScmAprovado(): void
    {
        $repo = $this->createMock(PvRepository::class);
        $repo->expects($this->once())
            ->method('updateItemsByWorstStatus')
            ->with(123, 'Aguardando envio')
            ->willReturn(true);

        $repo->expects($this->never())
            ->method('syncTicketsStatusByPvId');

        $service = $this->createPvService($repo);
        $result = $service->updateItemsByWorstStatus(123, 'Aguardando envio');

        $this->assertTrue($result);
    }

    public function testUpdateItemsByWorstStatusBatchSyncsTicketsForEachScmAprovadoPv(): void
    {
        $repo = $this->createMock(PvRepository::class);
        $repo->expects($this->exactly(2))
            ->method('updateItemsByWorstStatus')
            ->willReturn(true);

        $repo->expects($this->exactly(2))
            ->method('getWorstStatus')
            ->willReturn('SCM aprovado');

        $repo->expects($this->exactly(2))
            ->method('syncTicketsStatusByPvId')
            ->with($this->logicalOr(101, 102), 'Concluído')
            ->willReturn(1);

        $service = $this->createPvService($repo);
        $result = $service->updateItemsByWorstStatusBatch([101, 102], 'SCM aprovado');

        $this->assertTrue($result);
    }

    public function testSavePvWithScmAprovadoStatusSyncsTickets(): void
    {
        $repo = $this->createMock(PvRepository::class);
        $ticketService = $this->createMock(TicketService::class);

        $repo->method('beginTransaction');
        $repo->method('commit');
        $repo->method('save')->willReturn(456);
        $repo->method('getWorstStatus')->with(456)->willReturn('SCM aprovado');
        $repo->method('lookupTicketByOsAndEquip')->willReturn(['id' => 789]);

        // Expect existing ticket to be updated and PV ticket sync to be executed
        $repo->expects($this->once())
            ->method('syncTicketStatusById')
            ->with(789, 'Concluído');

        $repo->expects($this->once())
            ->method('syncTicketsStatusByPvId')
            ->with(456, 'Concluído');

        $service = $this->createPvService($repo, $ticketService);
        $pvId = $service->save([
            'numero_pv' => '260999',
            'equipamento_id' => 1,
            'os' => 'OS12345',
            'itens' => [
                ['fatura' => 'flpu', 'valor_flpu' => 100, 'bdi' => 20, 'quantidade' => 1, 'status' => 'SCM aprovado']
            ]
        ]);

        $this->assertSame(456, $pvId);
    }

    public function testUpdatePvWithScmAprovadoStatusSyncsTickets(): void
    {
        $repo = $this->createMock(PvRepository::class);
        $ticketService = $this->createMock(TicketService::class);

        $repo->method('beginTransaction');
        $repo->method('commit');
        $repo->method('update')->willReturn(true);
        $repo->method('getWorstStatus')->with(555)->willReturn('SCM aprovado');
        $repo->method('lookupTicketByOsAndEquip')->willReturn(['id' => 777]);

        $repo->expects($this->once())
            ->method('syncTicketStatusById')
            ->with(777, 'Concluído');

        $repo->expects($this->once())
            ->method('syncTicketsStatusByPvId')
            ->with(555, 'Concluído');

        $service = $this->createPvService($repo, $ticketService);
        $result = $service->update([
            'id' => 555,
            'equipamento_id' => 1,
            'os' => 'OS9999',
            'itens' => [
                ['fatura' => 'flpu', 'valor_flpu' => 100, 'bdi' => 20, 'quantidade' => 1, 'status' => 'SCM aprovado']
            ]
        ]);

        $this->assertTrue($result);
    }

    public function testScmImportSyncsApprovedPvTickets(): void
    {
        $scmRepo = $this->createMock(ScmRepository::class);
        $pvRepo = $this->createMock(PvRepository::class);
        $cycleService = $this->createMock(PreventiveCycleService::class);

        $csvRows = [
            [
                'SCM' => 'SCM-001',
                'DATA' => '2026-05-10',
                'ATIVIDADE' => 'CORRETIVA',
                'SITE' => 'SITE-A',
                'CIDADE' => 'CIDADE-A',
                'ABERTURA' => '',
                'STATUS' => 'GERADO', // Mapped to 'SCM aprovado'
                'DATA_EXECUÇÃO' => '2026-05-12',
                'DATA_VALIDAÇÃO' => '2026-05-15',
                'MEDIÇÃO' => '100',
                'ORIGEM' => 'CORRETIVA',
                'SEGMENTO' => 'CORRETIVA',
                'OBS' => 'OK',
            ]
        ];

        $scmRepo->method('findByScmCode')->willReturn(['id' => 10]);
        $scmRepo->expects($this->once())
            ->method('findPvIdsByScmCode')
            ->with('SCM-001')
            ->willReturn([88]);

        $scmRepo->expects($this->once())
            ->method('updatePvItemStatusByScm')
            ->with('SCM-001', 'SCM aprovado');

        $pvRepo->expects($this->once())
            ->method('getWorstStatus')
            ->with(88)
            ->willReturn('SCM aprovado');

        $pvRepo->expects($this->once())
            ->method('syncTicketsStatusByPvId')
            ->with(88, 'Concluído')
            ->willReturn(1);

        $scmService = new ScmService($scmRepo, $cycleService, $pvRepo);
        $result = $scmService->importBatch($csvRows);

        $this->assertSame(1, $result['updated']);
    }
}
