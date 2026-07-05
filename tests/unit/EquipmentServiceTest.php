<?php

namespace Tests\Unit;

use App\Api\Entities\Equipment;
use App\Api\Entities\Ticket;
use App\Api\Repositories\EquipmentPriceRepository;
use App\Api\Repositories\EquipmentRepository;
use App\Api\Repositories\TicketRepository;
use App\Api\Services\EquipmentService;
use PHPUnit\Framework\TestCase;

class EquipmentServiceTest extends TestCase
{
    private function createPriceMock(): EquipmentPriceRepository
    {
        $priceRepo = $this->createMock(EquipmentPriceRepository::class);
        $priceRepo->method('getActiveRules')->willReturn([]);
        $priceRepo->method('sumValueByFilter')->willReturn(0.0);
        return $priceRepo;
    }

    private function createService(
        EquipmentRepository $equipRepo,
        TicketRepository $ticketRepo,
        ?EquipmentPriceRepository $priceRepo = null
    ): EquipmentService {
        return new EquipmentService($equipRepo, $ticketRepo, $priceRepo ?? $this->createPriceMock());
    }

    public function testListAllPassesExcludedStatusToPendingPvQuery(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipRepo->method('listAll')->willReturn([
            new Equipment(['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook']),
        ]);
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([]);
        $priceRepo->method('sumValueByFilter')->willReturn(0.0);

        $equipRepo->expects($this->once())
            ->method('getPendingPvCountByEquipmentIds')
            ->with([1], EquipmentService::PENDING_PV_EXCLUDED_STATUS);

        $service = new EquipmentService($equipRepo, $ticketRepo, $priceRepo);
        $service->listAll();
    }

    public function testListAllReturnsFormattedItems(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);
        $priceRepo->method('sumValueByFilter')->willReturn(0.0);

        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([
            1 => [
                'total' => 1,
                'concluido' => 1,
                'pendente' => 0,
                'planejado' => 0,
                'em_andamento' => 0,
                'projeto_clean_up' => 0,
                'searchStatus' => 'concluído',
            ],
        ]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        $result = $service->listAll();

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertSame(1, $result['total']);
        $this->assertCount(1, $result['items']);

        $item = $result['items'][0];
        $this->assertSame(1, $item['id']);
        $this->assertSame('Sala A', $item['local']);
        $this->assertSame('Notebook', $item['equipamento']);
        $this->assertSame('', $item['color']);
        $this->assertSame('', $item['icon']);
        $this->assertSame('concluído', $item['searchStatus']);
        $this->assertSame(0, $item['pvs_pendentes_count']);
        $this->assertSame('', $item['pvs_pendentes']);
    }

    public function testListAllStatusCleanUpMapsToPurple(): void
    {
        $result = $this->runStatusScenario('projeto clean up');
        $this->assertSame('bg-purple-100 text-purple-800', $result['color']);
        $this->assertSame('🧹', $result['icon']);
    }

    public function testListAllStatusPlanejadoMapsToYellow(): void
    {
        $result = $this->runStatusScenario('planejado');
        $this->assertSame('bg-yellow-100 text-yellow-800', $result['color']);
        $this->assertSame('🕒', $result['icon']);
    }

    public function testListAllStatusPendenteMapsToRed(): void
    {
        $result = $this->runStatusScenario('pendente');
        $this->assertSame('bg-red-100 text-red-800', $result['color']);
        $this->assertSame('⚠️', $result['icon']);
    }

    public function testListAllStatusEmAndamentoMapsToBlue(): void
    {
        $result = $this->runStatusScenario('em andamento');
        $this->assertSame('bg-blue-100 text-blue-800', $result['color']);
        $this->assertSame('🛠️', $result['icon']);
    }

    private function runStatusScenario(string $status): array
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipRepo->method('listAll')->willReturn([
            new Equipment(['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook']),
        ]);
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $summaryKey = match (strtolower($status)) {
            'projeto clean up' => 'projeto_clean_up',
            'em andamento' => 'em_andamento',
            'pendente' => 'pendente',
            'planejado' => 'planejado',
            default => strtolower($status),
        };
        $summary = [
            'total' => 1,
            'concluido' => 0,
            'pendente' => 0,
            'planejado' => 0,
            'em_andamento' => 0,
            'projeto_clean_up' => 0,
            'searchStatus' => $status,
        ];
        $summary[$summaryKey] = 1;

        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([
            1 => $summary,
        ]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        return $service->listAll()['items'][0];
    }

    public function testListAllPrioritizesCleanUpOverOtherStatuses(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([
            1 => [
                'total' => 3,
                'concluido' => 0,
                'pendente' => 1,
                'planejado' => 1,
                'em_andamento' => 0,
                'projeto_clean_up' => 1,
                'searchStatus' => 'pendente, projeto clean up, planejado',
            ],
        ]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        $result = $service->listAll();
        $item = $result['items'][0];

        $this->assertSame('bg-purple-100 text-purple-800', $item['color']);
        $this->assertStringContainsString('projeto clean up', $item['searchStatus']);
        $this->assertStringContainsString('pendente', $item['searchStatus']);
        $this->assertStringContainsString('planejado', $item['searchStatus']);
    }

    public function testListAllBuildsSearchStatus(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([
            1 => [
                'total' => 1,
                'concluido' => 0,
                'pendente' => 0,
                'planejado' => 0,
                'em_andamento' => 1,
                'projeto_clean_up' => 0,
                'searchStatus' => 'Em andamento',
            ],
        ]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        $result = $service->listAll();
        $item = $result['items'][0];

        $this->assertStringContainsStringIgnoringCase('em andamento', $item['searchStatus']);
    }

    public function testListAllWithNoRecords(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);
        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        $result = $service->listAll();

        $item = $result['items'][0];
        $this->assertSame('', $item['color']);
        $this->assertSame('', $item['icon']);
        $this->assertSame('', $item['searchStatus']);
        $this->assertSame(0, $item['tickets_count']);
        $this->assertSame(0, $item['pvs_pendentes_count']);
        $this->assertSame('', $item['pvs_pendentes']);
    }

    public function testListAllIncludesRecords(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);
        $priceRepo = $this->createPriceMock();

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('countOS')->willReturn(0);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listTicketSummaryByEquipmentIds')->willReturn([
            1 => [
                'total' => 1,
                'concluido' => 1,
                'pendente' => 0,
                'planejado' => 0,
                'em_andamento' => 0,
                'projeto_clean_up' => 0,
                'searchStatus' => 'concluído',
            ],
        ]);

        $service = $this->createService($equipRepo, $ticketRepo, $priceRepo);
        $result = $service->listAll();

        $this->assertSame(1, $result['items'][0]['tickets_count']);
        $this->assertSame('concluído', $result['items'][0]['searchStatus']);
    }
}
