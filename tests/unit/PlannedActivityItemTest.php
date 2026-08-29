<?php

namespace Tests\Unit;

use App\Api\Repositories\PlannedActivityRepository;
use App\Api\Repositories\PreventivaRepository;
use App\Api\Services\PlannedActivityService;
use App\Api\Services\PreventivaService;
use PHPUnit\Framework\TestCase;

class PlannedActivityItemTest extends TestCase
{
    private function createMockRepo(): PlannedActivityRepository
    {
        return $this->createMock(PlannedActivityRepository::class);
    }

    private function createService(?PlannedActivityRepository $repo = null): PlannedActivityService
    {
        return new PlannedActivityService($repo);
    }

    public function testUpdateTeamReturnsFullItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateTeam')->willReturn(true);
        $fakeItem = ['id' => 1, 'tipo' => 'preventiva', 'equipe' => 'Nova Equipe', 'data_planejada' => '2026-08-01'];
        $repo->method('getItemById')->with(1, 'preventiva', null)->willReturn($fakeItem);

        $result = $this->createService($repo)->updateTeam(['id' => 1, 'tipo' => 'preventiva', 'equipe' => 'Nova Equipe']);

        $this->assertSame('updated', $result['action']);
        $this->assertSame($fakeItem, $result['item']);
    }

    public function testUpdateTeamCorretivaPassesDataPlanejadaToGetItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateTeam')->willReturn(true);
        $repo->method('getItemById')->with(2, 'corretiva', '2026-08-01')->willReturn(['id' => 2, 'tipo' => 'corretiva']);

        $result = $this->createService($repo)->updateTeam([
            'id' => 2,
            'tipo' => 'corretiva',
            'equipe' => 'Equipe B',
            'data_planejada' => '2026-08-01',
        ]);

        $this->assertArrayHasKey('item', $result);
    }

    public function testUpdateObsReturnsFullItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateObs')->willReturn(true);
        $fakeItem = ['id' => 3, 'tipo' => 'corretiva', 'obs' => 'Nova obs', 'data_planejada' => '2026-08-02'];
        $repo->method('getItemById')->with(3, 'corretiva', '2026-08-02')->willReturn($fakeItem);

        $result = $this->createService($repo)->updateObs(3, 'corretiva', 'Nova obs', '2026-08-02');

        $this->assertSame('updated', $result['action']);
        $this->assertSame($fakeItem, $result['item']);
    }

    public function testUpdateCorretivaStatusReturnsFullItemWithoutDate(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateCorretivaStatus')->willReturn(true);
        $repo->method('getItemById')->with(1, 'corretiva', null)->willReturn(['id' => 1, 'tipo' => 'corretiva', 'status' => 'Em andamento']);

        $result = $this->createService($repo)->updateCorretivaStatus(1, 'Em andamento');

        $this->assertSame('updated', $result['action']);
        $this->assertArrayHasKey('item', $result);
        $this->assertSame('Em andamento', $result['status']);
    }

    public function testUpdateCorretivaStatusMovedDateReturnsItemAtNewDate(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('moveDate')
            ->with(1, 'corretiva', '2026-08-01', '2026-08-05');
        $repo->method('updateCorretivaStatus')->willReturn(true);
        $repo->method('getItemById')->with(1, 'corretiva', '2026-08-05')->willReturn(['id' => 1, 'tipo' => 'corretiva', 'data_planejada' => '2026-08-05']);

        $result = $this->createService($repo)->updateCorretivaStatus(1, 'Planejado', '2026-08-05', '2026-08-01');

        $this->assertSame('updated', $result['action']);
        $this->assertSame('2026-08-05', $result['item']['data_planejada']);
    }

    public function testPlanActivityCreatedReturnsFullItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')->willReturn(null);
        $repo->method('createFromPlanning')->willReturn(9);
        $fakeItem = ['id' => 9, 'tipo' => 'preventiva', 'os' => 'OS202601', 'data_planejada' => '2026-08-01'];
        $repo->method('getItemById')->with(9, 'preventiva', null)->willReturn($fakeItem);

        $result = $this->createService($repo)->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-08-01',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertSame($fakeItem, $result['item']);
    }

    public function testPlanActivityUpdatedReturnsFullItem(): void
    {
        $ticket = $this->getMockBuilder(\App\Api\Entities\Ticket::class)
            ->disableOriginalConstructor()
            ->getMock();
        $ticket->id = 5;
        $ticket->notes = 'Observação anterior';

        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')->willReturn($ticket);
        $repo->method('getItemById')->with(5, 'preventiva', null)->willReturn(['id' => 5, 'tipo' => 'preventiva']);

        $result = $this->createService($repo)->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-08-01',
            'tipo' => 'preventiva',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('updated', $result['action']);
        $this->assertArrayHasKey('item', $result);
    }

    public function testDeleteReturnsIdAndTipo(): void
    {
        $ticket = $this->getMockBuilder(\App\Api\Entities\Ticket::class)
            ->disableOriginalConstructor()
            ->getMock();
        $ticket->id = 5;
        $ticket->tipo = 'corretiva';
        $ticket->origin = 'planning';
        $ticket->notes = '';
        $ticket->plannedDate = null;

        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($ticket);
        $repo->method('delete')->willReturn(true);

        $result = $this->createService($repo)->delete(5);

        $this->assertSame('deleted', $result['action']);
        $this->assertSame(5, $result['id']);
        $this->assertSame('corretiva', $result['tipo']);
    }

    public function testPreventivaUpdateStatusReturnsFullItem(): void
    {
        $repo = $this->createMock(PreventivaRepository::class);
        $repo->method('getById')->willReturn([
            'id' => 7,
            'site' => 'RJOCPG',
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $repo->method('countMachinesForSite')->with('RJOCPG')->willReturn(6);
        $repo->method('updateStatus')->willReturn(true);
        $repo->method('getPreventivaItemById')->with(7)->willReturn(['id' => 7, 'tipo' => 'preventiva', 'status' => 'Em Andamento']);

        $service = new PreventivaService($repo);
        $result = $service->updateStatus(7, 'Em Andamento', '', ['nome' => 'Admin', 'role' => 'admin'], null, 4);

        $this->assertSame('status_updated', $result['action']);
        $this->assertArrayHasKey('item', $result);
        $this->assertSame('Em Andamento', $result['item']['status']);
    }

    public function testPreventivaPlanReturnsFullItem(): void
    {
        $repo = $this->createMock(PreventivaRepository::class);
        $repo->method('create')->willReturn(12);
        $repo->method('getPreventivaItemById')->with(12)->willReturn(['id' => 12, 'tipo' => 'preventiva', 'status' => 'Planejado']);

        $service = new PreventivaService($repo);
        $result = $service->planPreventiva([
            'site' => 'RJOEN',
            'data_planejada' => '2026-08-01',
            'ticket' => '',
            'equipe' => 'Equipe A',
            'obs' => '',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertArrayHasKey('item', $result);
    }

    public function testPreventivaDeleteReturnsIdAndTipo(): void
    {
        $repo = $this->createMock(PreventivaRepository::class);
        $repo->method('getById')->willReturn(['id' => 3, 'status' => 'Planejado']);
        $repo->method('delete')->willReturn(true);

        $service = new PreventivaService($repo);
        $result = $service->delete(3);

        $this->assertSame('deleted', $result['action']);
        $this->assertSame(3, $result['id']);
        $this->assertSame('preventiva', $result['tipo']);
    }
}
