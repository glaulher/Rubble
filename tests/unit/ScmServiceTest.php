<?php

namespace Tests\Unit;

use App\Api\Repositories\ScmRepository;
use App\Api\Services\ScmService;
use PHPUnit\Framework\TestCase;

class ScmServiceTest extends TestCase
{
    private function createMockRepo(): ScmRepository
    {
        return $this->createMock(ScmRepository::class);
    }

    private function createService(?ScmRepository $repo = null): ScmService
    {
        return new ScmService(
            $repo ?? $this->createMockRepo()
        );
    }

    // --- listAll ---

    public function testListAllDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            ['id' => 1, 'scm' => '522386', 'status' => 'SCM aprovado'],
        ]);
        $repo->method('count')->willReturn(1);
        $repo->method('getTotalValue')->willReturn(5000.0);

        $service = $this->createService($repo);
        $result = $service->listAll(20, 0);

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertArrayHasKey('total_valor', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
        $this->assertSame(5000.0, $result['total_valor']);
    }

    public function testListAllWithFilters(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([]);
        $repo->method('count')->willReturn(0);
        $repo->method('getTotalValue')->willReturn(0.0);

        $service = $this->createService($repo);
        $result = $service->listAll(20, 0, 'RSD', '2026-01-01', '2026-12-31', ['Residencial'], 'SCM aprovado');

        $this->assertSame(0, $result['total']);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn([
            'id' => 1,
            'scm' => '522386',
            'status' => 'SCM aprovado',
            'items' => [],
        ]);

        $service = $this->createService($repo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
        $this->assertSame('522386', $result['scm']);
    }

    public function testGetByIdReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);

        $service = $this->createService($repo);
        $this->assertNull($service->getById(999));
    }

    // --- delete ---

    public function testDeleteDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('delete')
            ->with(1)
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->delete(1));
    }

    public function testDeleteReturnsFalseWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('delete')->willReturn(false);

        $service = $this->createService($repo);
        $this->assertFalse($service->delete(999));
    }

    // --- segments ---

    public function testSegmentsDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('segments')
            ->willReturn(['Residencial', 'Empresarial']);

        $service = $this->createService($repo);
        $result = $service->segments();

        $this->assertCount(2, $result);
        $this->assertContains('Residencial', $result);
    }

    // --- sites ---

    public function testSitesDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('sites')
            ->willReturn(['RSD', 'BGI', 'MCEBC']);

        $service = $this->createService($repo);
        $result = $service->sites();

        $this->assertCount(3, $result);
        $this->assertContains('RSD', $result);
    }

    // --- importBatch ---

    public function testImportBatchWithEmptyRows(): void
    {
        $repo = $this->createMockRepo();

        $service = $this->createService($repo);
        $result = $service->importBatch([]);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportBatchSkipsAbertoStatus(): void
    {
        $repo = $this->createMockRepo();

        $rows = [
            [
                'SCM' => '522386',
                'DATA' => '01/06/2026',
                'ATIVIDADE' => 'Manutenção',
                'SITE' => 'RSD',
                'CIDADE' => 'Resende',
                'ABERTURA' => '01/06/2026',
                'STATUS' => 'EM ABERTO',
                'DATA_EXECUÇÃO' => '',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => '',
                'ORIGEM' => 'MCEBC',
                'SEGMENTO' => 'Residencial',
                'OBS' => '',
                'SERVIÇO' => 'Troca de filtro',
                'UNIDADE' => 'UN',
                'VALOR' => '150.00',
                'QTDE_EXECUÇÃO' => '1',
                'SUBTOTAL_EXECUÇÃO' => '150.00',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(1, $result['skipped']);
    }

    public function testImportBatchSkipsAbertoVariants(): void
    {
        $repo = $this->createMockRepo();

        $rows = [
            [
                'SCM' => '522387',
                'STATUS' => 'ABERTO',
                'SITE' => 'RSD',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(1, $result['skipped']);
    }

    public function testImportBatchDropsEmptyScmCode(): void
    {
        $repo = $this->createMockRepo();

        $rows = [
            [
                'SCM' => '',
                'STATUS' => 'GERADO',
                'SITE' => 'RSD',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportBatchCreatesNewRecord(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('resolveEquipmentId')->willReturn(10);
        $repo->method('findByScmCode')->willReturnOnConsecutiveCalls(null, ['id' => 1]);
        $repo->method('upsert')->willReturn(true);
        $repo->method('upsertItems')->willReturn(true);
        $repo->method('updatePvItemStatusByScm')->willReturn(0);

        $rows = [
            [
                'SCM' => '522386',
                'DATA' => '01/06/2026 10:00',
                'ATIVIDADE' => 'Manutenção preventiva',
                'SITE' => 'RSD',
                'CIDADE' => 'Resende',
                'ABERTURA' => '01/06/2026',
                'STATUS' => 'GERADO',
                'DATA_EXECUÇÃO' => '02/06/2026 08:00',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => 'Medição teste',
                'ORIGEM' => 'MCEBC',
                'SEGMENTO' => 'Residencial',
                'OBS' => 'Observação teste',
                'SERVIÇO' => 'Troca de filtro',
                'UNIDADE' => 'UN',
                'VALOR' => '150.00',
                'QTDE_EXECUÇÃO' => '2',
                'SUBTOTAL_EXECUÇÃO' => '300.00',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(0, $result['skipped']);
        $this->assertEmpty($result['errors']);
    }

    public function testImportBatchUpdatesExistingRecord(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('resolveEquipmentId')->willReturn(10);
        $repo->method('findByScmCode')->willReturnOnConsecutiveCalls(
            ['id' => 5],
            ['id' => 5]
        );
        $repo->method('upsert')->willReturn(true);
        $repo->method('upsertItems')->willReturn(true);
        $repo->method('updatePvItemStatusByScm')->willReturn(0);

        $rows = [
            [
                'SCM' => '522386',
                'DATA' => '01/06/2026',
                'ATIVIDADE' => 'Manutenção',
                'SITE' => 'RSD',
                'CIDADE' => 'Resende',
                'ABERTURA' => '',
                'STATUS' => 'GERADO',
                'DATA_EXECUÇÃO' => '',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => '',
                'ORIGEM' => '',
                'SEGMENTO' => '',
                'OBS' => '',
                'SERVIÇO' => 'Serviço teste',
                'UNIDADE' => 'HH',
                'VALOR' => '200.00',
                'QTDE_EXECUÇÃO' => '1',
                'SUBTOTAL_EXECUÇÃO' => '200.00',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['updated']);
    }

    public function testImportBatchMapsNegadoStatus(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('resolveEquipmentId')->willReturn(10);
        $repo->method('findByScmCode')->willReturnOnConsecutiveCalls(null, ['id' => 1]);
        $repo->method('upsert')->willReturn(true);
        $repo->method('upsertItems')->willReturn(true);

        $repo->expects($this->once())
            ->method('updatePvItemStatusByScm')
            ->with('522386', 'SCM negado');

        $rows = [
            [
                'SCM' => '522386',
                'STATUS' => 'NEGADO',
                'SITE' => 'RSD',
                'DATA' => '',
                'ATIVIDADE' => '',
                'CIDADE' => '',
                'ABERTURA' => '',
                'DATA_EXECUÇÃO' => '',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => '',
                'ORIGEM' => '',
                'SEGMENTO' => '',
                'OBS' => '',
                'SERVIÇO' => '',
                'UNIDADE' => '',
                'VALOR' => '0',
                'QTDE_EXECUÇÃO' => '0',
                'SUBTOTAL_EXECUÇÃO' => '0',
            ],
        ];

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(1, $result['imported']);
    }

    public function testImportBatchGroupsMultipleItemsByScm(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('resolveEquipmentId')->willReturn(10);
        $repo->method('findByScmCode')->willReturnOnConsecutiveCalls(null, ['id' => 1]);
        $repo->method('upsert')->willReturn(true);
        $repo->method('upsertItems')->willReturn(true);
        $repo->method('updatePvItemStatusByScm')->willReturn(0);

        $rows = [
            [
                'SCM' => '522386',
                'STATUS' => 'GERADO',
                'SITE' => 'RSD',
                'DATA' => '01/06/2026',
                'ATIVIDADE' => 'Atividade',
                'CIDADE' => 'Resende',
                'ABERTURA' => '',
                'DATA_EXECUÇÃO' => '',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => '',
                'ORIGEM' => '',
                'SEGMENTO' => '',
                'OBS' => '',
                'SERVIÇO' => 'Serviço A',
                'UNIDADE' => 'UN',
                'VALOR' => '100.00',
                'QTDE_EXECUÇÃO' => '1',
                'SUBTOTAL_EXECUÇÃO' => '100.00',
            ],
            [
                'SCM' => '522386',
                'STATUS' => 'GERADO',
                'SITE' => 'RSD',
                'DATA' => '01/06/2026',
                'ATIVIDADE' => 'Atividade',
                'CIDADE' => 'Resende',
                'ABERTURA' => '',
                'DATA_EXECUÇÃO' => '',
                'DATA_VALIDAÇÃO' => '',
                'MEDIÇÃO' => '',
                'ORIGEM' => '',
                'SEGMENTO' => '',
                'OBS' => '',
                'SERVIÇO' => 'Serviço B',
                'UNIDADE' => 'HH',
                'VALOR' => '200.00',
                'QTDE_EXECUÇÃO' => '2',
                'SUBTOTAL_EXECUÇÃO' => '400.00',
            ],
        ];

        $repo->expects($this->once())
            ->method('upsertItems')
            ->with(1, $this->callback(fn($items) => count($items) === 2));

        $service = $this->createService($repo);
        $result = $service->importBatch($rows);

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
    }
}
