<?php

namespace Tests\Unit;

use App\Api\Repositories\PlannedActivityRepository;
use App\Api\Services\PlannedActivityService;
use PHPUnit\Framework\TestCase;

/**
 * Comportamento do tipo 'adm' nas operações de lista de atividades planejadas.
 */
class PlannedActivityAdmTypeTest extends TestCase
{
    private function createService(?PlannedActivityRepository $repo = null, ?\App\Api\Repositories\PreventivaRepository $prevRepo = null): PlannedActivityService
    {
        return new PlannedActivityService(
            $repo ?? $this->createMock(PlannedActivityRepository::class),
            $prevRepo ?? $this->createMock(\App\Api\Repositories\PreventivaRepository::class)
        );
    }

    public function testUpdateObsAcceptsAdmTipo(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('getItemById')->willReturn([
            'id' => 3,
            'tipo' => 'adm',
            'status' => 'Planejado',
            'obs' => 'x',
        ]);
        $repo->expects($this->once())
            ->method('updateObs')
            ->with(3, 'adm', 'Nova obs')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateObs(3, 'adm', 'Nova obs');

        $this->assertSame('updated', $result['action']);
    }

    public function testUpdateTeamAcceptsAdmTipo(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('getItemById')->willReturn([
            'id' => 4,
            'tipo' => 'adm',
            'status' => 'Planejado',
        ]);
        $repo->expects($this->once())
            ->method('updateTeam')
            ->with(4, 'adm', 'Equipe Externa')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateTeam([
            'id' => 4,
            'tipo' => 'adm',
            'equipe' => 'Equipe Externa',
        ]);

        $this->assertSame('updated', $result['action']);
        $this->assertSame('adm', $result['item']['tipo']);
    }

    public function testMoveDateAcceptsAdmTipo(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->expects($this->once())
            ->method('moveDate')
            ->with(5, 'adm', '2026-08-10', '2026-08-12');

        $service = $this->createService($repo);
        $result = $service->moveDate(5, 'adm', '2026-08-10', '2026-08-12');

        $this->assertSame('moved', $result['action']);
    }

    public function testReorderAcceptsAdmTipo(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->expects($this->once())
            ->method('batchUpdateSortOrder')
            ->with([9, 4], 'adm', '2026-08-10');

        $service = $this->createService($repo);
        $result = $service->reorder([9, 4], 'adm', '2026-08-10');

        $this->assertSame('reordered', $result['action']);
    }

    public function testDuplicateDaySendsAdmThroughPreventivaPath(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('findByDate')->willReturn([
            ['id' => 7, 'tipo' => 'adm'],
        ]);
        $repo->expects($this->once())
            ->method('duplicatePreventivaToDate')
            ->with(7, '2026-08-12', 'Planejado')
            ->willReturn(20);
        $repo->expects($this->never())
            ->method('duplicateCorretivaToDate');

        $service = $this->createService($repo);
        $result = $service->duplicateDay('2026-08-10', '2026-08-12');

        $this->assertSame('duplicated', $result['action']);
        $this->assertSame(1, $result['count']);
    }

    /*
    |--------------------------------------------------------------------------
    | updateAdmStatus()
    |--------------------------------------------------------------------------
    */

    public function testUpdateAdmStatusWritesAdmStatus(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('getItemById')->willReturn([
            'id' => 8,
            'tipo' => 'adm',
            'status' => 'Em andamento',
        ]);
        $repo->expects($this->once())
            ->method('updateAdmStatus')
            ->with(8, 'Em andamento')
            ->willReturn(true);
        $repo->expects($this->never())
            ->method('updateCorretivaStatus');

        $service = $this->createService($repo);
        $result = $service->updateAdmStatus(8, 'Em andamento');

        $this->assertSame('updated', $result['action']);
        $this->assertSame('Em andamento', $result['status']);
    }

    public function testUpdateAdmStatusAcceptsProjetoCleanUp(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('getItemById')->willReturn([
            'id' => 9,
            'tipo' => 'adm',
            'status' => 'Projeto Clean up',
        ]);
        $repo->expects($this->once())
            ->method('updateAdmStatus')
            ->with(9, 'Projeto Clean up')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateAdmStatus(9, 'projeto clean up');

        $this->assertSame('Projeto Clean up', $result['status']);
    }

    public function testUpdateAdmStatusPlanejadoMovesDate(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->method('getItemById')->willReturn([
            'id' => 10,
            'tipo' => 'adm',
            'status' => 'Planejado',
        ]);
        $repo->expects($this->once())
            ->method('moveDate')
            ->with(10, 'adm', '2026-08-10', '2026-08-14');
        $repo->expects($this->once())
            ->method('updateAdmStatus')
            ->with(10, 'Planejado')
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->updateAdmStatus(10, 'Planejado', '2026-08-14', '2026-08-10');

        $this->assertSame('updated', $result['action']);
    }

    public function testUpdateAdmStatusThrowsOnInvalidStatus(): void
    {
        $repo = $this->createMock(\App\Api\Repositories\PlannedActivityRepository::class);
        $repo->expects($this->never())->method('updateAdmStatus');

        $service = $this->createService($repo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Status inválido');

        $service->updateAdmStatus(1, 'Status Inexistente');
    }

    public function testUpdateAdmStatusThrowsOnInvalidId(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('ID inválido');

        $service->updateAdmStatus(0, 'Concluído');
    }
}
