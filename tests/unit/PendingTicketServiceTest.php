<?php

namespace Tests\Unit;

use App\Api\Repositories\TicketRepository;
use App\Api\Services\PendingTicketService;
use PHPUnit\Framework\TestCase;

class PendingTicketServiceTest extends TestCase
{
    private function createMockRepo(): TicketRepository
    {
        return $this->createMock(TicketRepository::class);
    }

    private function createService(?TicketRepository $repo = null): PendingTicketService
    {
        return new PendingTicketService(
            $repo ?? $this->createMockRepo()
        );
    }

    public function testListPendingBySiteDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([
            ['id' => 1, 'os' => 'OS123', 'status' => 'pendente', 'local' => 'BMA', 'equipamento' => 'WM 01'],
        ]);
        $repo->method('countPending')->willReturn(1);

        $service = $this->createService($repo);
        $result = $service->listPendingBySite(20, 0, '', '');

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
    }

    public function testListPendingBySiteWithSearchFilter(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $service = $this->createService($repo);
        $result = $service->listPendingBySite(20, 0, 'BMA', '');

        $this->assertSame(0, $result['total']);
        $this->assertEmpty($result['items']);
    }

    public function testListPendingBySiteWithStatusFilter(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $service = $this->createService($repo);
        $result = $service->listPendingBySite(20, 0, '', 'pendente');

        $this->assertSame(0, $result['total']);
    }

    public function testListPendingBySiteThrowsOnInvalidStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Status inválido');

        $service = $this->createService();
        $service->listPendingBySite(20, 0, '', 'status_invalido');
    }

    public function testListPendingBySitePassesOsFilter(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', [], 'e.local', 'ASC', 'OS123', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', '', 'e.local', 'ASC', 'OS123');
    }

    public function testListPendingBySiteExcludesFornecimentoLocation(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', [], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', '');
    }

    public function testCountPendingPassesOsFilter(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('', [], 'OS123', 'Fornecimento')
            ->willReturn(2);

        $service = $this->createService($repo);
        $this->assertSame(2, $service->countPending('', '', 'OS123'));
    }

    public function testCountPendingExcludesFornecimentoLocation(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('', [], '', 'Fornecimento')
            ->willReturn(4);

        $service = $this->createService($repo);
        $this->assertSame(4, $service->countPending('', ''));
    }

    public function testCountPendingDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('', [], '', 'Fornecimento')
            ->willReturn(5);

        $service = $this->createService($repo);
        $this->assertSame(5, $service->countPending('', ''));
    }

    public function testCountPendingWithFilters(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('BMA', ['pendente'], '', 'Fornecimento')
            ->willReturn(3);

        $service = $this->createService($repo);
        $this->assertSame(3, $service->countPending('BMA', 'pendente'));
    }

    public function testCountPendingThrowsOnInvalidStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $service = $this->createService();
        $service->countPending('', 'invalido');
    }

    public function testSearchTruncatedAt200Chars(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $longSearch = str_repeat('a', 300);
        $expectedTruncated = str_repeat('a', 200);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, $this->anything(), $expectedTruncated, [], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, $longSearch, '');
    }

    public function testSortParamsPassedCorrectly(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', [], 'r.data', 'DESC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', '', 'r.data', 'desc');
    }

    public function testOffsetPassedThrough(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 40, '', [], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 40, '', '');
    }

    public function testSortByFallbackToDefaultWhenNotAllowed(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', [], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', '', 'r.id; DROP TABLE registros', 'ASC');
    }

    public function testUpdatePendingFieldDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'material', 'Filtro novo')
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->updatePendingField(10, 'material', 'Filtro novo'));
    }

    public function testUpdatePendingFieldNormalizesStatusToLowercase(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'status', 'pendente')
            ->willReturn(true);

        $service = $this->createService($repo);
        $service->updatePendingField(10, 'status', 'PENDENTE');
    }

    public function testUpdatePendingFieldNormalizesPriorityToUppercase(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'prioridade', '0-D')
            ->willReturn(true);

        $service = $this->createService($repo);
        $service->updatePendingField(10, 'prioridade', '0-d');
    }

    public function testUpdatePendingFieldAcceptsAllPriorityValues(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->exactly(10))
            ->method('updatePendingField')
            ->willReturn(true);

        $service = $this->createService($repo);
        foreach (['0', '0-A', '0-B', '0-C', '0-D', '0-E', '1', '3', '4', '5'] as $priority) {
            $service->updatePendingField(10, 'prioridade', $priority);
        }
    }

    public function testUpdatePendingFieldThrowsOnInvalidPriority(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Prioridade inválida');

        $service = $this->createService();
        $service->updatePendingField(10, 'prioridade', '2');
    }

    public function testUpdatePendingFieldDelegatesObs(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'obs', 'Trocar filtro')
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->updatePendingField(10, 'obs', '  Trocar filtro  '));
    }

    public function testUpdatePendingFieldConvertsEmptyObsToNull(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'obs', null)
            ->willReturn(true);

        $service = $this->createService($repo);
        $service->updatePendingField(10, 'obs', '   ');
    }

    public function testUpdatePendingFieldThrowsOnNonEditableField(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Campo não editável');

        $service = $this->createService();
        $service->updatePendingField(10, 'local', 'BMA');
    }

    public function testUpdatePendingFieldThrowsOnInvalidStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Status inválido');

        $service = $this->createService();
        $service->updatePendingField(10, 'status', 'status_invalido');
    }

    public function testUpdatePendingFieldConvertsEmptyValueToNull(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('updatePendingField')
            ->with(10, 'data_prevista_conclusao', null)
            ->willReturn(true);

        $service = $this->createService($repo);
        $service->updatePendingField(10, 'data_prevista_conclusao', '  ');
    }

    public function testListPendingBySitePassesMultiStatusArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', ['pendente', 'concluído'], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', 'pendente,concluído');
    }

    public function testCountPendingPassesMultiStatusArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('', ['pendente', 'concluído'], '', 'Fornecimento')
            ->willReturn(2);

        $service = $this->createService($repo);
        $this->assertSame(2, $service->countPending('', 'pendente,concluído'));
    }

    public function testListPendingBySiteNormalizesStatusCase(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listPendingBySite')->willReturn([]);
        $repo->method('countPending')->willReturn(0);

        $repo->expects($this->once())
            ->method('listPendingBySite')
            ->with(20, 0, '', ['concluído'], 'e.local', 'ASC', '', 'Fornecimento');

        $service = $this->createService($repo);
        $service->listPendingBySite(20, 0, '', 'CONCLUÍDO');
    }

    public function testListPendingBySiteThrowsOnInvalidMultiStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Status inválido');

        $service = $this->createService();
        $service->listPendingBySite(20, 0, '', 'pendente,status_invalido');
    }

    public function testCountPendingAllowsConcluido(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('countPending')
            ->with('', ['concluído'], '', 'Fornecimento')
            ->willReturn(4);

        $service = $this->createService($repo);
        $this->assertSame(4, $service->countPending('', 'concluído'));
    }

    public function testUpdatePendingFieldAcceptsConcluido(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->exactly(2))
            ->method('updatePendingField')
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->updatePendingField(10, 'status', 'concluído'));
        $this->assertTrue($service->updatePendingField(10, 'status', 'CONCLUIDO'));
    }

    public function testListPendingBySiteReturnsEmptyForNoneStatus(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('listPendingBySite');
        $repo->expects($this->never())->method('countPending');

        $service = $this->createService($repo);
        $result = $service->listPendingBySite(20, 0, '', '__none__');

        $this->assertSame([], $result['items']);
        $this->assertSame(0, $result['total']);
    }

    public function testCountPendingReturnsZeroForNoneStatus(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('countPending');

        $service = $this->createService($repo);
        $this->assertSame(0, $service->countPending('', '__none__'));
    }
}
