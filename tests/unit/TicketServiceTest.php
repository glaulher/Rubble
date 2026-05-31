<?php

namespace Tests\Unit;

use App\Api\Entities\Equipment;
use App\Api\Entities\Ticket;
use App\Api\Repositories\EquipmentRepository;
use App\Api\Repositories\TicketRepository;
use App\Api\Services\TicketService;
use PHPUnit\Framework\TestCase;

class TicketServiceTest extends TestCase
{
    private function createMockRepo(): TicketRepository
    {
        return $this->createMock(TicketRepository::class);
    }

    private function createMockEquipmentRepo(): EquipmentRepository
    {
        return $this->createMock(EquipmentRepository::class);
    }

    private function makeTicket(array $data = []): Ticket
    {
        return new Ticket(array_merge([
            'id' => '1',
            'equipamento_id' => '5',
            'os' => 'OS-001',
            'data' => '2026-05-01',
            'equipe' => 'Equipe A',
            'status' => 'concluído',
            'material' => 'Material teste',
        ], $data));
    }

    // --- listByItem ---

    public function testListByItemReturnsArrayOfArrays(): void
    {
        $repo = $this->createMockRepo();
        $tickets = [$this->makeTicket(), $this->makeTicket(['id' => '2', 'os' => 'OS-002'])];
        $repo->method('listByItem')->willReturn($tickets);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->listByItem(5);

        $this->assertCount(2, $result);
        $this->assertIsArray($result[0]);
        $this->assertSame('OS-001', $result[0]['os']);
        $this->assertSame('OS-002', $result[1]['os']);
    }

    public function testListByItemReturnsEmptyArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listByItem')->willReturn([]);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->listByItem(999);

        $this->assertSame([], $result);
    }

    // --- save ---

    public function testSaveReturnsInsertedId(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('save')->willReturn(42);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->save(['os' => 'OS-003', 'equipamento_id' => '5']);

        $this->assertSame(42, $result);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->makeTicket());

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
        $this->assertSame('OS-001', $result['os']);
    }

    public function testGetByIdReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertNull($service->getById(999));
    }

    // --- update ---

    public function testUpdateReturnsTrue(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('update')->willReturn(true);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertTrue($service->update(['id' => '1', 'status' => 'pendente']));
    }

    public function testUpdateReturnsFalse(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('update')->willReturn(false);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertFalse($service->update(['id' => '999']));
    }

    // --- delete ---

    public function testDeleteReturnsTrue(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('delete')->willReturn(true);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertTrue($service->delete(1));
    }

    public function testDeleteReturnsFalse(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('delete')->willReturn(false);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertFalse($service->delete(999));
    }

    // --- findByOs ---

    public function testFindByOsReturnsTicketArray(): void
    {
        $repo = $this->createMockRepo();
        $ticket = $this->makeTicket(['os' => 'OS-001']);
        $repo->method('findByOs')->with('OS-001')->willReturn($ticket);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->findByOs('OS-001');

        $this->assertIsArray($result);
        $this->assertSame('OS-001', $result['os']);
    }

    public function testFindByOsReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByOs')->with('NONEXISTENT')->willReturn(null);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $this->assertNull($service->findByOs('NONEXISTENT'));
    }

    // --- importBatch ---

    public function testImportBatchCreatesNewTicketWhenOsNotFound(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $ticketRepo->method('findByOs')->with('TASK-001')->willReturn(null);
        $ticketRepo->method('save')->willReturn(42);

        $equipRepo->method('listByLocal')->with('RSDDTC')->willReturn([
            new Equipment([
                'id' => '10',
                'local' => 'RSDDTC',
                'equipamento' => 'SELF 01',
            ]),
        ]);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'tarefa' => 'TASK-001',
                'empresa' => 'RDJ - RSDDTC - Resende',
                'dataCriacao' => '21/05/2026 08:30:00',
                'dataAlteracao' => '21/05/2026 17:00:00',
                'tag' => 'SELF 01',
                'tecnico' => 'João',
                'status' => 'Concluido',
                'materiais' => '[Parafuso, Porca]',
                'problema' => 'Vazamento',
                'causa' => 'Desgaste',
                'solucao' => 'Troca de vedação',
            ],
        ];

        $result = $service->importBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportBatchUpdatesExistingTicket(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $ticketRepo->method('findByOs')->with('TASK-001')->willReturn(
            new Ticket(['id' => 5, 'equipamento_id' => 10, 'os' => 'TASK-001'])
        );
        $ticketRepo->method('update')->willReturn(true);

        $equipRepo->method('listByLocal')->with('RSDDTC')->willReturn([
            new Equipment([
                'id' => '10',
                'local' => 'RSDDTC',
                'equipamento' => 'SELF 01',
            ]),
        ]);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'tarefa' => 'TASK-001',
                'empresa' => 'RDJ - RSDDTC - Resende',
                'dataCriacao' => '21/05/2026 08:30:00',
                'dataAlteracao' => '21/05/2026 17:00:00',
                'tag' => 'SELF 01',
                'tecnico' => 'João',
                'status' => 'Concluido',
                'materiais' => '',
                'problema' => 'Vazamento de água',
                'causa' => 'Vedação danificada',
                'solucao' => 'Substituir vedação',
            ],
        ];

        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['updated']);
        $this->assertSame(0, $result['skipped']);
    }

    public function testImportBatchMultipleEquipmentMatches(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $ticketRepo->method('findByOs')->willReturn(null);
        $ticketRepo->method('save')->willReturn(1);

        $equipRepo->method('listByLocal')->with('RSDDTC')->willReturn([
            new Equipment(['id' => '1', 'local' => 'RSDDTC', 'equipamento' => 'STULZ 01']),
            new Equipment(['id' => '2', 'local' => 'RSDDTC', 'equipamento' => 'STULZ 02']),
            new Equipment(['id' => '3', 'local' => 'RSDDTC', 'equipamento' => 'STULZ 03']),
        ]);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'tarefa' => 'TASK-002',
                'empresa' => 'RDJ - RSDDTC - Resende',
                'dataCriacao' => '21/05/2026 08:30:00',
                'dataAlteracao' => '',
                'tag' => 'NÃO SE APLICA',
                'tecnico' => 'Maria',
                'status' => 'Pendente',
                'materiais' => '[]',
                'problema' => 'Problema no STULZ 01',
                'causa' => 'STULZ 02 com desgaste',
                'solucao' => 'STULZ 03 revisado',
            ],
        ];

        $result = $service->importBatch($rows);

        $this->assertSame(3, $result['imported']);
        $this->assertSame(0, $result['updated']);
    }

    public function testImportBatchSkipsWhenNoEquipmentMatch(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('listByLocal')->with('RSDDTC')->willReturn([
            new Equipment(['id' => '1', 'local' => 'RSDDTC', 'equipamento' => 'STULZ 01']),
        ]);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'tarefa' => 'TASK-003',
                'empresa' => 'RDJ - RSDDTC - Resende',
                'dataCriacao' => '21/05/2026 08:30:00',
                'dataAlteracao' => '',
                'tag' => 'NONEXISTENT',
                'tecnico' => 'João',
                'status' => 'Pendente',
                'materiais' => '',
                'problema' => '',
                'causa' => '',
                'solucao' => '',
            ],
        ];

        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(1, $result['errors']);
        $this->assertStringContainsString('Equipamento', $result['errors'][0]['motivo']);
    }

    public function testImportBatchSkipsWhenInvalidSiteCode(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'tarefa' => 'TASK-004',
                'empresa' => 'SOMENTEUMSEGMENTO',
                'tag' => 'SELF 01',
                'tecnico' => 'João',
                'status' => 'Pendente',
                'materiais' => '',
            ],
        ];

        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('Local', $result['errors'][0]['motivo']);
    }
}
