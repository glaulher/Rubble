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
        $result = $service->save(['os' => '123456', 'equipamento_id' => '5']);

        $this->assertSame(42, $result);
    }

    public function testSaveThrowsWhenOsExceedsMaxLength(): void
    {
        $repo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('OS deve ter no máximo 20 caracteres');

        $service->save(['os' => 'ABCDEFGHIJKLMNOPQRSTU', 'equipamento_id' => '5']);
    }

    public function testSaveAcceptsAlphaNumericOs(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('save')->willReturn(42);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->save(['os' => 'OS001A', 'equipamento_id' => '5']);

        $this->assertSame(42, $result);
    }

    public function testSaveThrowsWhenOsHasInvalidChars(): void
    {
        $repo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->save(['os' => 'OS@123!', 'equipamento_id' => '5']);
    }

    public function testSaveAcceptsOsUpTo20Chars(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('save')->willReturn(42);

        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);
        $result = $service->save(['os' => 'ABCDEFGH1234567890', 'equipamento_id' => '5']);

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

    public function testUpdateThrowsWhenOsExceedsMaxLength(): void
    {
        $repo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('OS deve ter no máximo 20 caracteres');

        $service->update(['id' => '1', 'os' => 'ABCDEFGHIJKLMNOPQRSTU']);
    }

    public function testUpdateThrowsWhenOsHasInvalidChars(): void
    {
        $repo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();
        $service = new TicketService($repo, $equipRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->update(['id' => '1', 'os' => 'OS$%']);
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

        $ticketRepo->method('findByOsAndEquipment')->with('TASK-001', 10)->willReturn(null);
        $ticketRepo->method('save')->willReturn(42);

        $equipRepo->method('listByLocal')->with('RSD')->willReturn([
            new Equipment([
                'id' => '10',
                'local' => 'RSD',
                'equipamento' => 'SELF 01',
            ]),
        ]);
        $equipRepo->method('listByLocalLike')->with('RSD')->willReturn([]);

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

        $ticketRepo->method('findByOsAndEquipment')->with('TASK-001', 10)->willReturn(
            new Ticket(['id' => 5, 'equipamento_id' => 10, 'os' => 'TASK-001'])
        );
        $ticketRepo->method('update')->willReturn(true);

        $equipRepo->method('listByLocal')->with('RSD')->willReturn([
            new Equipment([
                'id' => '10',
                'local' => 'RSD',
                'equipamento' => 'SELF 01',
            ]),
        ]);
        $equipRepo->method('listByLocalLike')->with('RSD')->willReturn([]);

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

        $ticketRepo->method('findByOsAndEquipment')->willReturn(null);
        $ticketRepo->method('save')->willReturn(1);

        $equipRepo->method('listByLocal')->with('RSD')->willReturn([
            new Equipment(['id' => '1', 'local' => 'RSD', 'equipamento' => 'STULZ 01']),
            new Equipment(['id' => '2', 'local' => 'RSD', 'equipamento' => 'STULZ 02']),
            new Equipment(['id' => '3', 'local' => 'RSD', 'equipamento' => 'STULZ 03']),
        ]);
        $equipRepo->method('listByLocalLike')->with('RSD')->willReturn([]);

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

        $equipRepo->method('listByLocal')->with('RSD')->willReturn([
            new Equipment(['id' => '1', 'local' => 'RSD', 'equipamento' => 'STULZ 01']),
        ]);
        $equipRepo->method('listByLocalLike')->with('RSD')->willReturn([]);

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

    // --- importInfratelBatch ---

    public function testImportInfratelBatchCreatesNewTicket(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Equipamento inoperante devido a vazamento',
                'acao_tecnico' => 'Necessário reparo no sistema',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchFiltersWhenBothNaOrEmpty(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'N/A',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(1, $result['errors']);
    }

    public function testImportInfratelBatchKeepsWhenJustificativasOnlyIsNa(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'N/A',
                'acao_tecnico' => 'Necessário reparo no sistema',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
    }

    public function testImportInfratelBatchKeepsWhenAcaoTecnicoOnlyIsNa(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Vazamento detectado no sistema',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
    }

    public function testImportInfratelBatchSkipsWhenNoEquipmentMatch(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')->willReturn(null);
        $equipRepo->method('findByInfratelSite')->willReturn([]);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'NONEXISTENT',
                'equipamento' => 'NONEXISTENT',
                'justificativas' => 'Problema detectado',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'João',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(1, $result['errors']);
        $this->assertStringContainsString('equipamento', strtolower($result['errors'][0]['motivo']));
    }

    public function testImportInfratelBatchGroupsByEquipment(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Vazamento na linha de sucção',
                'acao_tecnico' => 'Necessário reparo',
                'acao_validador' => 'N/A',
                'fim' => '22/06/2026',
                'executor' => 'Moisés Torres',
            ],
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Ventilador com defeito',
                'acao_tecnico' => 'Aguardando peça',
                'acao_validador' => 'Programar reparo',
                'fim' => '28/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchUpdatesExisting(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $existing = new Ticket([
            'id' => 5,
            'equipamento_id' => 10,
            'os' => 'INFRATEL1',
            'obs' => 'Pendência antiga',
        ]);

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn($existing);
        $ticketRepo->method('update')->willReturn(true);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchCreatesNewWhenExistingConcluded(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $existing = new Ticket([
            'id' => 5,
            'equipamento_id' => 10,
            'os' => 'INFRATEL15',
            'status' => 'Concluído',
            'obs' => 'Pendência antiga',
        ]);

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn($existing);
        $ticketRepo->method('findInfratelOsRows')->willReturn([
            ['os' => 'INFRATEL15', 'status' => 'Pendente'],
        ]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });
        $ticketRepo->expects($this->never())->method('update');

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
        $this->assertNotNull($savedData);
        $this->assertSame('INFRATEL16', $savedData['os']);
        $this->assertSame('Pendente', $savedData['status']);
    }

    public function testImportInfratelBatchUsesOldestDate(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Segunda pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '28/06/2026',
                'executor' => 'Moisés Torres',
            ],
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Primeira pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '22/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $service->importInfratelBatch($rows);

        $this->assertNotNull($savedData);
        $this->assertSame('2026-06-22', $savedData['data']);
    }

    public function testImportInfratelBatchSetsMaterialSim(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Problema',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $service->importInfratelBatch($rows);

        $this->assertNotNull($savedData);
        $this->assertSame('Sim', $savedData['material']);
    }

    public function testImportInfratelBatchSetsStatusPendente(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Problema',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '27/06/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $service->importInfratelBatch($rows);

        $this->assertNotNull($savedData);
        $this->assertSame('Pendente', $savedData['status']);
    }

    public function testImportInfratelBatchResolvesCompositeTagEvPart(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')->willReturn(null);
        $equipRepo->method('findByInfratelSite')
            ->with('RJOFRG')
            ->willReturn([
                new Equipment([
                    'id' => '102',
                    'local' => 'RJOFRG',
                    'equipamento' => 'SELF SPLIT 01',
                    'site_infratel' => 'RJOFRG',
                    'tag_infratel' => 'CLIMA - CD-01 / TRANE / SALA DE UPS | CLIMA - EV-01 / TRANE / SALA DE UPS',
                ]),
            ]);

        $ticketRepo->method('findInfratelByEquipment')->with(102)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'RJOFRG',
                'equipamento' => 'CLIMA - EV-01 / TRANE / SALA DE UPS',
                'justificativas' => 'Vazamento na serpentina do condensador',
                'acao_tecnico' => 'Brasagem, pressurização, vácuo e carga de fluido refrigerante',
                'acao_validador' => 'N/A',
                'fim' => '06/08/2026',
                'executor' => 'Alexandre Donato da Silva',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchResolvesCompositeTagCdPart(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')->willReturn(null);
        $equipRepo->method('findByInfratelSite')
            ->with('RJOFRG')
            ->willReturn([
                new Equipment([
                    'id' => '102',
                    'local' => 'RJOFRG',
                    'equipamento' => 'SELF SPLIT 01',
                    'site_infratel' => 'RJOFRG',
                    'tag_infratel' => 'CLIMA - CD-01 / TRANE / SALA DE UPS | CLIMA - EV-01 / TRANE / SALA DE UPS',
                ]),
            ]);

        $ticketRepo->method('findInfratelByEquipment')->with(102)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([]);
        $ticketRepo->method('save')->willReturn(42);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'RJOFRG',
                'equipamento' => 'CLIMA - CD-01 / TRANE / SALA DE UPS',
                'justificativas' => 'Bateria do sistema de resfriamento com defeito',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '06/08/2026',
                'executor' => 'Alexandre Donato da Silva',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchBothEvAndCdRowsMergeIntoSameTicket(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')->willReturn(null);
        $equipRepo->method('findByInfratelSite')
            ->with('RJOFRG')
            ->willReturn([
                new Equipment([
                    'id' => '102',
                    'local' => 'RJOFRG',
                    'equipamento' => 'SELF SPLIT 01',
                    'site_infratel' => 'RJOFRG',
                    'tag_infratel' => 'CLIMA - CD-01 / TRANE / SALA DE UPS | CLIMA - EV-01 / TRANE / SALA DE UPS',
                ]),
            ]);

        $existing = new Ticket([
            'id' => 5,
            'equipamento_id' => 102,
            'os' => 'INFRATEL1',
            'status' => 'Pendente',
            'obs' => 'Pendência antiga',
        ]);

        $ticketRepo->method('findInfratelByEquipment')->with(102)->willReturn($existing);
        $ticketRepo->method('update')->willReturn(true);

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'RJOFRG',
                'equipamento' => 'CLIMA - EV-01 / TRANE / SALA DE UPS',
                'justificativas' => 'Vazamento na serpentina do condensador',
                'acao_tecnico' => 'Brasagem, pressurização, vácuo e carga de fluido refrigerante',
                'acao_validador' => 'N/A',
                'fim' => '06/08/2026',
                'executor' => 'Alexandre Donato da Silva',
            ],
            [
                'site' => 'RJOFRG',
                'equipamento' => 'CLIMA - CD-01 / TRANE / SALA DE UPS',
                'justificativas' => 'Bateria do sistema de resfriamento com defeito',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '06/08/2026',
                'executor' => 'Alexandre Donato da Silva',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(2, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportInfratelBatchUpdatesExistingPendente(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $existing = new Ticket([
            'id' => 5,
            'equipamento_id' => 10,
            'os' => 'INFRATEL1',
            'status' => 'Pendente',
            'obs' => 'Pendência antiga',
        ]);

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn($existing);

        $updatedData = null;
        $ticketRepo->method('update')->willReturnCallback(function ($data) use (&$updatedData) {
            $updatedData = $data;
            return true;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertNotEmpty($updatedData);
        $this->assertSame('Pendente', $updatedData['status']);
        $this->assertSame('INFRATEL1', $updatedData['os']);
        $this->assertStringContainsString('Nova pendência', $updatedData['obs']);
        $this->assertStringContainsString('Pendência antiga', $updatedData['obs']);
    }

    public function testImportInfratelBatchIgnoresConcludedRenamedOsNumber(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([
            ['os' => 'INFRATEL47', 'status' => 'Pendente'],
            ['os' => 'INFRATEL4787430', 'status' => 'Concluído'],
        ]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertNotNull($savedData);
        $this->assertSame('INFRATEL48', $savedData['os']);
    }

    public function testImportInfratelBatchIgnoresLargePendingOsNumber(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([
            ['os' => 'INFRATEL47', 'status' => 'Pendente'],
            ['os' => 'INFRATEL4787431', 'status' => 'Pendente'],
        ]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertNotNull($savedData);
        $this->assertSame('INFRATEL48', $savedData['os']);
    }

    public function testImportInfratelBatchNextNumberWithOnlyConcludedRenamed(): void
    {
        $ticketRepo = $this->createMockRepo();
        $equipRepo = $this->createMockEquipmentRepo();

        $equipRepo->method('findByInfratel')
            ->with('BGU02DTC', 'CLIMA - ARCON 02')
            ->willReturn(new Equipment(['id' => '10', 'local' => 'BGU', 'equipamento' => 'CLIMA - ARCON 02']));

        $ticketRepo->method('findInfratelByEquipment')->with(10)->willReturn(null);
        $ticketRepo->method('findInfratelOsRows')->willReturn([
            ['os' => 'INFRATEL4787430', 'status' => 'Concluído'],
        ]);

        $savedData = null;
        $ticketRepo->method('save')->willReturnCallback(function ($data) use (&$savedData) {
            $savedData = $data;
            return 42;
        });

        $service = new TicketService($ticketRepo, $equipRepo);

        $rows = [
            [
                'site' => 'BGU02DTC',
                'equipamento' => 'CLIMA - ARCON 02',
                'justificativas' => 'Nova pendência',
                'acao_tecnico' => 'N/A',
                'acao_validador' => 'N/A',
                'fim' => '15/07/2026',
                'executor' => 'Moisés Torres',
            ],
        ];

        $result = $service->importInfratelBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertNotNull($savedData);
        $this->assertSame('INFRATEL1', $savedData['os']);
    }

    // --- nextEmergenciaOs ---

    public function testNextEmergenciaOsStartsAt01WhenEmpty(): void
    {
        $ticketRepo = $this->createMockRepo();
        $ticketRepo->method('findEmergenciaOsRows')->willReturn([]);

        $service = new TicketService($ticketRepo, $this->createMockEquipmentRepo());

        $this->assertSame('EMERGENCIAL01', $service->nextEmergenciaOs());
    }

    public function testNextEmergenciaOsIncrementsSequentially(): void
    {
        $ticketRepo = $this->createMockRepo();
        $ticketRepo->method('findEmergenciaOsRows')->willReturn([
            ['os' => 'EMERGENCIAL01'],
            ['os' => 'EMERGENCIAL02'],
        ]);

        $service = new TicketService($ticketRepo, $this->createMockEquipmentRepo());

        $this->assertSame('EMERGENCIAL03', $service->nextEmergenciaOs());
    }

    public function testNextEmergenciaOsBeyond99KeepsNaturalNumber(): void
    {
        $ticketRepo = $this->createMockRepo();
        $ticketRepo->method('findEmergenciaOsRows')->willReturn([
            ['os' => 'EMERGENCIAL99'],
        ]);

        $service = new TicketService($ticketRepo, $this->createMockEquipmentRepo());

        $this->assertSame('EMERGENCIAL100', $service->nextEmergenciaOs());
    }

    public function testNextEmergenciaOsIgnoresOtherOsFormats(): void
    {
        $ticketRepo = $this->createMockRepo();
        $ticketRepo->method('findEmergenciaOsRows')->willReturn([
            ['os' => 'INFRATEL1'],
            ['os' => '4674717'],
            ['os' => 'EMERGENCIAL07'],
        ]);

        $service = new TicketService($ticketRepo, $this->createMockEquipmentRepo());

        $this->assertSame('EMERGENCIAL08', $service->nextEmergenciaOs());
    }

    public function testNextEmergenciaOsPadsLeadingZero(): void
    {
        $ticketRepo = $this->createMockRepo();
        $ticketRepo->method('findEmergenciaOsRows')->willReturn([
            ['os' => 'EMERGENCIAL9'],
        ]);

        $service = new TicketService($ticketRepo, $this->createMockEquipmentRepo());

        $this->assertSame('EMERGENCIAL10', $service->nextEmergenciaOs());
    }
}
