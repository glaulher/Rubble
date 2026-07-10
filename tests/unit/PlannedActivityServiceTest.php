<?php

namespace Tests\Unit;

use App\Api\Repositories\PlannedActivityRepository;
use App\Api\Services\PlannedActivityService;
use PHPUnit\Framework\TestCase;

class PlannedActivityServiceTest extends TestCase
{
    private function createMockRepo(): PlannedActivityRepository
    {
        return $this->createMock(PlannedActivityRepository::class);
    }

    private function createService(?PlannedActivityRepository $repo = null): PlannedActivityService
    {
        return new PlannedActivityService($repo);
    }

    public function testPlanActivityThrowsWhenOsIsEmpty(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->planActivity([
            'os' => '',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityThrowsWhenOsHasInvalidChars(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->planActivity([
            'os' => 'OS@#$',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityThrowsWhenOsExceedsMaxLength(): void
    {
        $repo = $this->createMockRepo();
        $service = $this->createService($repo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('OS deve ter no máximo 20 caracteres');

        $service->planActivity([
            'os' => 'ABCDEFGHIJKLMNOPQRSTU',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityAcceptsAlphaNumericOs(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')->willReturn(null);
        $repo->method('createFromPlanning')->willReturn(1);

        $service = $this->createService($repo);
        $result = $service->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertSame(1, $result['id']);
    }

    public function testPlanActivityUpdatesExistingByOsAndEquip(): void
    {
        $ticket = $this->getMockBuilder(\App\Api\Entities\Ticket::class)
            ->disableOriginalConstructor()
            ->getMock();
        $ticket->id = 5;
        $ticket->notes = 'Observação anterior';

        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')
            ->willReturn($ticket);

        $service = $this->createService($repo);
        $result = $service->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('updated', $result['action']);
    }

    /*
    |--------------------------------------------------------------------------
    | duplicateDay() tests
    |--------------------------------------------------------------------------
    */

    public function testDuplicateDayThrowsWhenSameDate(): void
    {
        $service = $this->createService($this->createMockRepo());

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('A data de destino deve ser diferente');

        $service->duplicateDay('2026-07-15', '2026-07-15');
    }

    public function testDuplicateDayThrowsWhenInvalidSourceFormat(): void
    {
        $service = $this->createService($this->createMockRepo());

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato da data de origem inválido');

        $service->duplicateDay('15/07/2026', '2026-07-16');
    }

    public function testDuplicateDayThrowsWhenInvalidTargetFormat(): void
    {
        $service = $this->createService($this->createMockRepo());

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato da data de destino inválido');

        $service->duplicateDay('2026-07-15', '16/07/2026');
    }

    public function testDuplicateDayThrowsWhenNoItemsFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByDate')->willReturn([]);

        $service = $this->createService($repo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Nenhuma atividade encontrada');

        $service->duplicateDay('2026-07-15', '2026-07-16');
    }

    public function testDuplicateDayDuplicatesPreventivaAndCorretiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByDate')->willReturn([
            ['id' => 1, 'tipo' => 'preventiva'],
            ['id' => 2, 'tipo' => 'corretiva'],
            ['id' => 3, 'tipo' => 'preventiva'],
        ]);

        $preventivaCalls = [];
        $repo->expects($this->exactly(2))
            ->method('duplicatePreventivaToDate')
            ->willReturnCallback(function ($id, $date, $status) use (&$preventivaCalls) {
                $preventivaCalls[] = [$id, $date, $status];
                return $id;
            });

        $repo->expects($this->exactly(1))
            ->method('duplicateCorretivaToDate')
            ->with(2, '2026-07-16', 'Planejado', 'planning')
            ->willReturn(2);

        $service = $this->createService($repo);
        $result = $service->duplicateDay('2026-07-15', '2026-07-16');

        $this->assertSame('duplicated', $result['action']);
        $this->assertSame(3, $result['count']);
    }

    /*
    |--------------------------------------------------------------------------
    | updateObs() tests
    |--------------------------------------------------------------------------
    */

    public function testUpdateObsSuccessForPreventiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateObs')
            ->with(1, 'preventiva', 'Nova observação')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateObs(1, 'preventiva', 'Nova observação');

        $this->assertSame('updated', $result['action']);
        $this->assertSame(1, $result['id']);
    }

    public function testUpdateObsSuccessForCorretiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateObs')
            ->with(2, 'corretiva', 'Obs corretiva')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateObs(2, 'corretiva', 'Obs corretiva');

        $this->assertSame('updated', $result['action']);
    }

    public function testUpdateObsThrowsOnInvalidId(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('ID inválido');

        $service->updateObs(0, 'preventiva', 'obs');
    }

    public function testUpdateObsThrowsOnInvalidTipo(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Tipo inválido');

        $service->updateObs(1, 'invalido', 'obs');
    }

    public function testUpdateObsThrowsWhenObsTooLong(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Observação deve ter no máximo 1000 caracteres');

        $service->updateObs(1, 'preventiva', str_repeat('x', 1001));
    }

    public function testUpdateObsAcceptsEmptyObs(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateObs')->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateObs(1, 'preventiva', '');

        $this->assertSame('updated', $result['action']);
    }

    /*
    |--------------------------------------------------------------------------
    | updateCorretivaStatus() tests
    |--------------------------------------------------------------------------
    */

    public function testUpdateCorretivaStatusSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateCorretivaStatus')
            ->with(1, 'Em andamento', null)
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateCorretivaStatus(1, 'Em andamento');

        $this->assertSame('updated', $result['action']);
        $this->assertSame(1, $result['id']);
    }

    public function testUpdateCorretivaStatusConcluidoSetsData(): void
    {
        $today = date('Y-m-d');
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateCorretivaStatus')
            ->with(1, 'Concluído', $today)
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateCorretivaStatus(1, 'Concluído');

        $this->assertSame('updated', $result['action']);
    }

    public function testUpdateCorretivaStatusThrowsOnInvalidId(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('ID inválido');

        $service->updateCorretivaStatus(0, 'Concluído');
    }

    public function testUpdateCorretivaStatusThrowsOnInvalidStatus(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Status inválido');

        $service->updateCorretivaStatus(1, 'Status Inexistente');
    }

    /*
    |--------------------------------------------------------------------------
    | reorder() tests
    |--------------------------------------------------------------------------
    */

    public function testReorderThrowsWhenOrderEmpty(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Ordem inválida');

        $service->reorder([], 'corretiva', '2026-07-15');
    }

    public function testReorderThrowsWhenTipoInvalido(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Tipo inválido');

        $service->reorder([1, 2, 3], 'invalido', '2026-07-15');
    }

    public function testReorderThrowsWhenDateInvalid(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de data inválido');

        $service->reorder([1, 2, 3], 'corretiva', '15/07/2026');
    }

    public function testReorderSuccessPreventiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('batchUpdateSortOrder')
            ->with([3, 1, 2], 'preventiva', '2026-07-15');

        $service = $this->createService($repo);
        $result = $service->reorder([3, 1, 2], 'preventiva', '2026-07-15');

        $this->assertSame('reordered', $result['action']);
    }

    public function testReorderSuccessCorretiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('batchUpdateSortOrder')
            ->with([5, 8, 3], 'corretiva', '2026-07-15');

        $service = $this->createService($repo);
        $result = $service->reorder([5, 8, 3], 'corretiva', '2026-07-15');

        $this->assertSame('reordered', $result['action']);
    }

    /*
    |--------------------------------------------------------------------------
    | moveDate() tests
    |--------------------------------------------------------------------------
    */

    public function testMoveDateThrowsInvalidId(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('ID inválido');

        $service->moveDate(0, 'corretiva', '2026-07-15', '2026-07-16');
    }

    public function testMoveDateThrowsInvalidTipo(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Tipo inválido');

        $service->moveDate(1, 'invalido', '2026-07-15', '2026-07-16');
    }

    public function testMoveDateThrowsInvalidSourceDate(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato da data de origem inválido');

        $service->moveDate(1, 'corretiva', '15/07/2026', '2026-07-16');
    }

    public function testMoveDateThrowsInvalidTargetDate(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato da data de destino inválido');

        $service->moveDate(1, 'corretiva', '2026-07-15', '16/07/2026');
    }

    public function testMoveDateThrowsSameDate(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('A data de destino deve ser diferente da data de origem.');

        $service->moveDate(1, 'corretiva', '2026-07-15', '2026-07-15');
    }

    public function testMoveDateSuccessPreventiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('moveDate')
            ->with(1, 'preventiva', '2026-07-15', '2026-07-16');

        $service = $this->createService($repo);
        $result = $service->moveDate(1, 'preventiva', '2026-07-15', '2026-07-16');

        $this->assertSame('moved', $result['action']);
    }

    public function testMoveDateSuccessCorretiva(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('moveDate')
            ->with(2, 'corretiva', '2026-07-10', '2026-07-11');

        $service = $this->createService($repo);
        $result = $service->moveDate(2, 'corretiva', '2026-07-10', '2026-07-11');

        $this->assertSame('moved', $result['action']);
    }
}
