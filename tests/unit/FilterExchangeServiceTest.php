<?php

namespace Tests\Unit;

use App\Api\Repositories\FilterExchangeRepository;
use App\Api\Repositories\EquipmentRepository;
use App\Api\Services\FilterExchangeService;
use App\Api\Services\TicketService;
use PHPUnit\Framework\TestCase;

class FilterExchangeServiceTest extends TestCase
{
    private function createMockRepo(): FilterExchangeRepository
    {
        return $this->createMock(FilterExchangeRepository::class);
    }

    private function createMockTicketService(): TicketService
    {
        return $this->createMock(TicketService::class);
    }

    private function createMockEquipmentRepo(): EquipmentRepository
    {
        return $this->createMock(EquipmentRepository::class);
    }

    private function createService(
        ?FilterExchangeRepository $repo = null,
        ?TicketService $ticketService = null,
        ?EquipmentRepository $equipmentRepo = null
    ): FilterExchangeService {
        return new FilterExchangeService(
            $repo ?? $this->createMockRepo(),
            $ticketService ?? $this->createMockTicketService(),
            $equipmentRepo ?? $this->createMockEquipmentRepo()
        );
    }

    public function testComputeNextDateAddsFourMonths(): void
    {
        $service = $this->createService();
        $this->assertSame('2026-11-15', $service->computeNextDate('2026-07-15'));
    }

    public function testComputeNextDateHandlesYearBoundary(): void
    {
        $service = $this->createService();
        $this->assertSame('2027-02-28', $service->computeNextDate('2026-10-28'));
    }

    public function testComputeNextDateReturnsNullForEmpty(): void
    {
        $service = $this->createService();
        $this->assertNull($service->computeNextDate(''));
        $this->assertNull($service->computeNextDate(null));
    }

    public function testComputeStatusPendenteWhenNoDate(): void
    {
        $service = $this->createService();
        $this->assertSame('pendente', $service->computeStatus(null));
        $this->assertSame('pendente', $service->computeStatus(''));
    }

    public function testComputeStatusPendenteWhenDueOrOverdue(): void
    {
        $service = $this->createService();
        $this->assertSame('pendente', $service->computeStatus(date('Y-m-d')));
        $this->assertSame('pendente', $service->computeStatus(date('Y-m-d', strtotime('-3 months'))));
    }

    public function testComputeStatusPlanejadoWithinTwoMonths(): void
    {
        $service = $this->createService();
        $inOneMonth = date('Y-m-d', strtotime('+1 month'));
        $this->assertSame('planejado', $service->computeStatus($inOneMonth));
    }

    public function testComputeStatusConcluidoBeyondTwoMonths(): void
    {
        $service = $this->createService();
        $inSixMonths = date('Y-m-d', strtotime('+6 months'));
        $this->assertSame('concluído', $service->computeStatus($inSixMonths));
    }

    public function testListAllDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            ['id' => 1, 'local' => 'RSDDTC', 'equipamento' => 'WM', 'qtd' => 4, 'data_troca' => '2026-07-15', 'data_proxima_troca' => '2026-11-15'],
        ]);
        $repo->method('count')->willReturn(1);
        $repo->method('sumQtd')->willReturn(4);

        $service = $this->createService($repo);
        $result = $service->listAll(20, 0, '', '', 'f.local', 'ASC');

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertArrayHasKey('total_qtd', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
        $this->assertSame(4, $result['total_qtd']);
    }

    public function testListAllThrowsOnInvalidStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Status inválido');

        $service = $this->createService();
        $service->listAll(20, 0, '', 'status_invalido', 'f.local', 'ASC');
    }

    public function testCreateDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('create')
            ->with([
                'local' => 'RSDDTC',
                'equipamento' => 'WM',
                'uf' => 'RJ',
                'regiao' => 'RJ',
                'tamanho' => '510X390X25mm',
                'qtd' => 4,
            ])
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->create('RSDDTC', 'WM', 'RJ', 'RJ', '510X390X25mm', 4));
    }

    public function testUpdateFieldDataTrocaRecomputesNextDate(): void
    {
        $repo = $this->createMockRepo();
        $calls = [];
        $repo->expects($this->exactly(2))
            ->method('updateField')
            ->willReturnCallback(function (int $id, string $field, $value) use (&$calls): bool {
                $calls[] = [$id, $field, $value];
                return true;
            });

        $service = $this->createService($repo);
        $this->assertTrue($service->updateField(1, 'data_troca', '2026-07-15'));

        $this->assertCount(2, $calls);
        $this->assertSame([1, 'data_troca', '2026-07-15'], $calls[0]);
        $this->assertSame([1, 'data_proxima_troca', '2026-11-15'], $calls[1]);
    }

    public function testUpdateFieldDataTrocaEmptyClearsNextDate(): void
    {
        $repo = $this->createMockRepo();
        $calls = [];
        $repo->expects($this->exactly(2))
            ->method('updateField')
            ->willReturnCallback(function (int $id, string $field, $value) use (&$calls): bool {
                $calls[] = [$id, $field, $value];
                return true;
            });

        $service = $this->createService($repo);
        $this->assertTrue($service->updateField(1, 'data_troca', ''));

        $this->assertCount(2, $calls);
        $this->assertSame([1, 'data_troca', null], $calls[0]);
        $this->assertSame([1, 'data_proxima_troca', null], $calls[1]);
    }

    public function testUpdateFieldOsInvalidFormatThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service = $this->createService();
        $service->updateField(1, 'os', 'OS 123 #inv');
    }

    public function testUpdateFieldUnknownFieldThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Campo inválido');

        $service = $this->createService();
        $service->updateField(1, 'status', 'concluído');
    }

    public function testUpdateFieldOsCreatesConcludedTicketsWhenMissing(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn([
            'id' => 1,
            'local' => 'RSDDTC',
            'equipamento' => 'WM',
            'data_troca' => '2026-07-15',
        ]);
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'os', 'OS123')
            ->willReturn(true);

        $ticketService = $this->createMockTicketService();
        $ticketService->method('findByOs')->willReturn(null);
        $ticketService->expects($this->exactly(2))
            ->method('save')
            ->willReturn(10, 11);

        $equipmentRepo = $this->createMockEquipmentRepo();
        $equipmentRepo->method('findByLocalScmAndName')
            ->with('RSDDTC', 'WM')
            ->willReturn([['id' => 5], ['id' => 6]]);

        $service = $this->createService($repo, $ticketService, $equipmentRepo);
        $this->assertTrue($service->updateField(1, 'os', 'OS123'));
    }

    public function testUpdateFieldOsDoesNotCreateWhenAlreadyExists(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'os', 'OS123')
            ->willReturn(true);

        $ticketService = $this->createMockTicketService();
        $ticketService->method('findByOs')->willReturn(['id' => 99, 'os' => 'OS123']);
        $ticketService->expects($this->never())->method('save');

        $equipmentRepo = $this->createMockEquipmentRepo();
        $equipmentRepo->expects($this->never())->method('findByLocalScmAndName');

        $service = $this->createService($repo, $ticketService, $equipmentRepo);
        $this->assertTrue($service->updateField(1, 'os', 'OS123'));
    }

    public function testUpdateFieldOsEmptySkipsCreation(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'os', null)
            ->willReturn(true);

        $ticketService = $this->createMockTicketService();
        $ticketService->expects($this->never())->method('save');
        $ticketService->expects($this->never())->method('findByOs');

        $equipmentRepo = $this->createMockEquipmentRepo();
        $equipmentRepo->expects($this->never())->method('findByLocalScmAndName');

        $service = $this->createService($repo, $ticketService, $equipmentRepo);
        $this->assertTrue($service->updateField(1, 'os', ''));
    }

    public function testUpdateFieldOsWhenRowNotFoundSkipsCreation(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'os', 'OS123')
            ->willReturn(true);

        $ticketService = $this->createMockTicketService();
        $ticketService->method('findByOs')->willReturn(null);
        $ticketService->expects($this->never())->method('save');

        $equipmentRepo = $this->createMockEquipmentRepo();
        $equipmentRepo->expects($this->never())->method('findByLocalScmAndName');

        $service = $this->createService($repo, $ticketService, $equipmentRepo);
        $this->assertTrue($service->updateField(1, 'os', 'OS123'));
    }

    public function testUpdateFieldTamanhoAllowedForAdmin(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'tamanho', '510X390X25mm')
            ->willReturn(true);

        $service = $this->createService($repo);
        $user = (object) ['role' => 'admin'];
        $this->assertTrue($service->updateField(1, 'tamanho', '510X390X25mm', $user));
    }

    public function testUpdateFieldQtdAllowedForAdmin(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updateField')
            ->with(1, 'qtd', 4)
            ->willReturn(true);

        $service = $this->createService($repo);
        $user = (object) ['role' => 'admin'];
        $this->assertTrue($service->updateField(1, 'qtd', 4, $user));
    }

    public function testUpdateFieldTamanhoRejectedForCoordenador(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('updateField');

        $service = $this->createService($repo);
        $user = (object) ['role' => 'coordenador'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Apenas administradores');

        $service->updateField(1, 'tamanho', '510X390X25mm', $user);
    }

    public function testUpdateFieldQtdRejectedForSupervisor(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('updateField');

        $service = $this->createService($repo);
        $user = (object) ['role' => 'supervisor'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Apenas administradores');

        $service->updateField(1, 'qtd', 4, $user);
    }

    public function testUpdateFieldTamanhoRejectedWithoutUser(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('updateField');

        $service = $this->createService($repo);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Apenas administradores');

        $service->updateField(1, 'tamanho', '510X390X25mm', null);
    }

    public function testDeleteDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('delete')
            ->with(7)
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->delete(7));
    }
}
