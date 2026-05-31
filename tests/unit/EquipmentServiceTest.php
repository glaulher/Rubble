<?php

namespace Tests\Unit;

use App\Api\Entities\Equipment;
use App\Api\Entities\Ticket;
use App\Api\Repositories\EquipmentRepository;
use App\Api\Repositories\TicketRepository;
use App\Api\Services\EquipmentService;
use PHPUnit\Framework\TestCase;

class EquipmentServiceTest extends TestCase
{
    public function testListAllReturnsFormattedItems(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listByItems')->willReturn([
            1 => [
                new Ticket(['id' => 1, 'equipamento_id' => 1, 'status' => 'concluído']),
            ],
        ]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
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
        $this->assertSame('', $item['searchStatus']);
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

        $equipRepo->method('listAll')->willReturn([
            new Equipment(['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook']),
        ]);
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listByItems')->willReturn([
            1 => [new Ticket(['id' => 1, 'equipamento_id' => 1, 'status' => $status])],
        ]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
        return $service->listAll()['items'][0];
    }

    public function testListAllPrioritizesCleanUpOverOtherStatuses(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listByItems')->willReturn([
            1 => [
                new Ticket(['id' => 1, 'equipamento_id' => 1, 'status' => 'pendente']),
                new Ticket(['id' => 2, 'equipamento_id' => 1, 'status' => 'projeto clean up']),
                new Ticket(['id' => 3, 'equipamento_id' => 1, 'status' => 'planejado']),
            ],
        ]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
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

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketRepo->method('listByItems')->willReturn([
            1 => [
                new Ticket(['id' => 1, 'equipamento_id' => 1, 'status' => 'Em andamento']),
            ],
        ]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
        $result = $service->listAll();
        $item = $result['items'][0];

        $this->assertStringContainsString('em andamento', $item['searchStatus']);
    }

    public function testListAllWithNoRecords(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);
        $ticketRepo->method('listByItems')->willReturn([]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
        $result = $service->listAll();

        $item = $result['items'][0];
        $this->assertSame('', $item['color']);
        $this->assertSame('', $item['icon']);
        $this->assertSame('', $item['searchStatus']);
        $this->assertSame([], $item['tickets']);
        $this->assertSame(0, $item['pvs_pendentes_count']);
        $this->assertSame('', $item['pvs_pendentes']);
    }

    public function testListAllIncludesRecords(): void
    {
        $equipRepo = $this->createMock(EquipmentRepository::class);
        $ticketRepo = $this->createMock(TicketRepository::class);

        $equipmentData = [
            ['id' => 1, 'local' => 'Sala A', 'equipamento' => 'Notebook', 'info' => null, 'endereco_id' => null, 'local_do_endereco' => null, 'endereco' => null, 'capacidade' => null, 'localidade' => null],
        ];

        $equipRepo->method('listAll')->willReturn(
            array_map(fn($d) => new Equipment($d), $equipmentData)
        );
        $equipRepo->method('count')->willReturn(1);
        $equipRepo->method('getPendingPvCountByEquipmentIds')->willReturn([]);

        $ticketData = [
            ['id' => 1, 'equipamento_id' => 1, 'os' => 'OS-001', 'status' => 'concluído', 'data' => '2026-05-17', 'equipe' => null, 'material' => null, 'obs' => null, 'data_concluido' => null, 'notificacao_enviada' => null, 'local' => null, 'equipamento' => null],
        ];

        $ticketRepo->method('listByItems')->willReturn([
            1 => array_map(fn($d) => new Ticket($d), $ticketData),
        ]);

        $service = new EquipmentService($equipRepo, $ticketRepo);
        $result = $service->listAll();

        $this->assertCount(1, $result['items'][0]['tickets']);
        $this->assertSame('OS-001', $result['items'][0]['tickets'][0]['os']);
    }
}
