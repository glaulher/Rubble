<?php

namespace Tests\Unit;

use App\Api\Entities\Pv;
use App\Api\Repositories\PvRepository;
use App\Api\Services\PvService;
use App\Api\Services\TicketService;
use PHPUnit\Framework\TestCase;

class PvServiceTest extends TestCase
{
    private function createMockRepo(): PvRepository
    {
        return $this->createMock(PvRepository::class);
    }

    private function createService(?PvRepository $repo = null, ?TicketService $ticketService = null): PvService
    {
        return new PvService(
            $repo ?? $this->createMock(PvRepository::class),
            $ticketService ?? $this->createMock(TicketService::class)
        );
    }

    // --- calculateItemTotalValue ---

    public function testCalculateItemTotalValueWithLpu(): void
    {
        $service = $this->createService();
        $item = ['quantidade' => '3', 'valor' => '100.50', 'fatura' => 'lpu'];
        $this->assertSame(301.5, $service->calculateItemTotalValue($item));
    }

    public function testCalculateItemTotalValueWithFlpu(): void
    {
        $service = $this->createService();
        $item = ['quantidade' => '2', 'valor_flpu' => '200', 'bdi' => '40', 'fatura' => 'flpu'];
        $this->assertSame(560.0, $service->calculateItemTotalValue($item));
    }

    public function testCalculateItemTotalValueWithFlpuNoBdi(): void
    {
        $service = $this->createService();
        $item = ['quantidade' => '2', 'valor_flpu' => '200', 'fatura' => 'flpu'];
        $this->assertSame(400.0, $service->calculateItemTotalValue($item));
    }

    public function testCalculateItemTotalValueDefaultsToQuantityOne(): void
    {
        $service = $this->createService();
        $item = ['valor' => '50', 'fatura' => 'lpu'];
        $this->assertSame(50.0, $service->calculateItemTotalValue($item));
    }

    public function testCalculateItemTotalValueDefaultsToLpu(): void
    {
        $service = $this->createService();
        $item = ['quantidade' => '4', 'valor' => '25'];
        $this->assertSame(100.0, $service->calculateItemTotalValue($item));
    }

    // --- generateNumberPv ---

    public function testGenerateNumberPvReturnsPrefixedSequence(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('26150');

        $service = $this->createService($repo);
        $result = $service->generateNumberPv();

        $this->assertStringStartsWith('26', $result);
        $this->assertSame('260151', $result);
    }

    public function testGenerateNumberPvHandlesNullMax(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn(null);

        $service = $this->createService($repo);
        $result = $service->generateNumberPv();

        $this->assertStringStartsWith('26', $result);
        $this->assertSame('260145', $result);
    }

    public function testGenerateNumberPvAppliesMinimumFloor(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('26001');

        $service = $this->createService($repo);
        $result = $service->generateNumberPv();

        $this->assertSame('260145', $result);
    }

    public function testGenerateNumberPvKeepsSequenceAboveFloor(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('260150');

        $service = $this->createService($repo);
        $result = $service->generateNumberPv();

        $this->assertSame('260151', $result);
    }

    // --- listAll ---

    public function testListAllReturnsFormattedResponse(): void
    {
        $repo = $this->createMockRepo();
        $pv = new Pv(['id' => '1', 'numero_pv' => '26001', 'local' => 'Sala A', 'status' => 'ativo', 'equipamento_id' => '5']);

        $repo->method('listAll')->willReturn([$pv]);
        $repo->method('count')->willReturn(1);
        $repo->method('getTotalValue')->willReturn(1500.0);

        $service = $this->createService($repo);
        $result = $service->listAll();

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertArrayHasKey('total_valor', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
        $this->assertSame(1500.0, $result['total_valor']);
        $this->assertSame('26001', $result['items'][0]['numero_pv']);
    }

    public function testListAllWithFilters(): void
    {
        $repo = $this->createMockRepo();
        $pv = new Pv(['id' => '2', 'numero_pv' => '26002', 'local' => 'Sala B',             'status' => 'SCM aprovado', 'equipamento_id' => '10']);

        $repo->method('listAll')->willReturn([$pv]);
        $repo->method('count')->willReturn(1);
        $repo->method('getTotalValue')->willReturn(0.0);

        $service = $this->createService($repo);
        $result = $service->listAll(10, 0, 'Sala', 'scm aprovado', '2026-05');

        $this->assertCount(1, $result['items']);
        $this->assertSame('Sala B', $result['items'][0]['local']);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $pv = new Pv(['id' => '1', 'numero_pv' => '26001', 'local' => 'Sala A', 'status' => 'ativo', 'equipamento_id' => '5']);

        $repo->method('getById')->willReturn($pv);

        $service = $this->createService($repo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
    }

    public function testGetByIdReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);

        $service = $this->createService($repo);
        $this->assertNull($service->getById(999));
    }

    // --- lookupLpuItem ---

    public function testLookupLpuItemReturnsData(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 150.0]);

        $service = $this->createService($repo);
        $result = $service->lookupLpuItem('lpu_material_clima', 100);

        $this->assertIsArray($result);
        $this->assertSame('Teste', $result['descricao']);
    }

    public function testLookupLpuItemReturnsNullForInvalidOrigin(): void
    {
        $repo = $this->createMockRepo();

        $service = $this->createService($repo);
        $result = $service->lookupLpuItem('invalid_origin', 100);

        $this->assertNull($result);
    }

    // --- searchLpuItems ---

    public function testSearchLpuItemsReturnsResults(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('searchLpuItems')->willReturn([
            ['numero_item' => 100, 'descricao' => 'Item A', 'valor' => 50.0],
        ]);

        $service = $this->createService($repo);
        $result = $service->searchLpuItems('lpu_material_clima', 'Item');

        $this->assertCount(1, $result);
    }

    public function testSearchLpuItemsReturnsEmptyForInvalidOrigin(): void
    {
        $service = $this->createService();
        $result = $service->searchLpuItems('invalid', 'test');
        $this->assertSame([], $result);
    }

    // --- save ---

    public function testSaveGeneratesNumberAndSavesItems(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('260010');
        $repo->method('save')->willReturn(42);
        $repo->method('saveItem')->willReturn(1);
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 50.0]);

        $data = [
            'numero_pv' => '',
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => '5',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 100, 'quantidade' => 2, 'valor' => 50],
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->save($data);

        $this->assertSame(42, $result);
    }

    public function testSaveResolvesOsByEquipamentoId(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('260010');
        $repo->method('save')->willReturn(42);
        $repo->method('saveItem')->willReturn(1);
        $repo->method('getWorstStatus')->willReturn('Aguardando envio');
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 50.0]);

        $repo->expects($this->once())
            ->method('lookupTicketByOsAndEquip')
            ->with('2233345', 5);

        $ticketService = $this->createMock(\App\Api\Services\TicketService::class);
        $ticketService->method('save')->willReturn(99);

        $service = $this->createService($repo, $ticketService);

        $data = [
            'local' => 'Sala A',
            'equipamento_id' => '5',
            'os' => '2233345',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 100, 'quantidade' => 1, 'valor' => 50],
            ],
        ];

        $service->save($data);
    }

    public function testSaveReusesExistingTicketByOsAndEquip(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('260010');
        $repo->method('save')->willReturn(42);
        $repo->method('saveItem')->willReturn(1);
        $repo->method('getWorstStatus')->willReturn('Aguardando envio');
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 50.0]);

        $repo->expects($this->once())
            ->method('lookupTicketByOsAndEquip')
            ->with('2233345', 5)
            ->willReturn(['id' => 99, 'os' => '2233345']);

        $service = $this->createService($repo);

        $data = [
            'local' => 'Sala A',
            'equipamento_id' => '5',
            'os' => '2233345',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 100, 'quantidade' => 1, 'valor' => 50],
            ],
        ];

        $result = $service->save($data);

        $this->assertSame(42, $result);
    }

    public function testUpdateResolvesOsByEquipamentoId(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('update')->willReturn(true);
        $repo->method('deleteItemsByPvId')->willReturn(true);
        $repo->method('saveItem')->willReturn(1);
        $repo->method('getWorstStatus')->willReturn('Aguardando envio');
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 100.0]);

        $repo->expects($this->once())
            ->method('lookupTicketByOsAndEquip')
            ->with('2233345', 5);

        $ticketService = $this->createMock(\App\Api\Services\TicketService::class);
        $ticketService->method('save')->willReturn(99);

        $service = $this->createService($repo, $ticketService);

        $data = [
            'id' => '1',
            'local' => 'Sala A',
            'equipamento_id' => '5',
            'os' => '2233345',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 100, 'quantidade' => 1, 'valor' => 100],
            ],
        ];

        $service->update($data);
    }

    public function testSaveThrowsForInvalidLpuItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getMaxNumberPv')->willReturn('260010');
        $repo->method('lookupLpuItem')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Item LPU não encontrado');

        $data = [
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => '5',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 999, 'quantidade' => 1, 'valor' => 50],
            ],
        ];

        $service = $this->createService($repo);
        $service->save($data);
    }

    public function testSaveUsesProvidedNumberPv(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('save')->willReturn(43);

        $data = [
            'numero_pv' => '26100',
            'local' => 'Sala B',
            'status' => 'ativo',
            'equipamento_id' => '5',
        ];

        $service = $this->createService($repo);
        $result = $service->save($data);

        $this->assertSame(43, $result);
    }

    // --- update ---

    public function testUpdateDeletesAndReplacesItems(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('update')->willReturn(true);
        $repo->method('deleteItemsByPvId')->willReturn(true);
        $repo->method('saveItem')->willReturn(1);
        $repo->method('lookupLpuItem')->willReturn(['descricao' => 'Teste', 'valor' => 100.0]);

        $data = [
            'id' => '1',
            'local' => 'Sala A',
            'status' => 'SCM aprovado',
            'equipamento_id' => '5',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 100, 'quantidade' => 1, 'valor' => 100],
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->update($data);

        $this->assertTrue($result);
    }

    public function testUpdateThrowsForInvalidLpuItem(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('lookupLpuItem')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Item LPU não encontrado');

        $data = [
            'id' => '1',
            'local' => 'Sala A',
            'status' => 'SCM aprovado',
            'equipamento_id' => '5',
            'itens' => [
                ['fatura' => 'lpu', 'lpu_origem' => 'lpu_material_clima', 'numero_item' => 999, 'quantidade' => 1, 'valor' => 50],
            ],
        ];

        $service = $this->createService($repo);
        $service->update($data);
    }

    // --- updateItemsByWorstStatus ---

    public function testUpdateItemsByWorstStatusDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('updateItemsByWorstStatus')->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->updateItemsByWorstStatus(1, 'cancelado'));
    }

    // --- listLocations ---

    public function testListLocationsDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listLocations')->willReturn(['Sala A', 'Sala B']);

        $service = $this->createService($repo);
        $result = $service->listLocations();

        $this->assertCount(2, $result);
        $this->assertContains('Sala A', $result);
    }

    // --- delete ---

    public function testDeleteDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('delete')->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->delete(1));
    }

    // --- getItemsForExport ---

    public function testGetItemsForExportDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getItemsByPvIds')->willReturn([1 => [['id' => 1]]]);

        $service = $this->createService($repo);
        $result = $service->getItemsForExport([1]);

        $this->assertArrayHasKey(1, $result);
    }
}
