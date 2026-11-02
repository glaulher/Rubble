<?php

namespace Tests\Unit;

use App\Api\Entities\EstoqueMaterial;
use App\Api\Entities\EstoqueSaida;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Api\Repositories\EstoqueSaidaRepository;
use App\Config\Database;
use PHPUnit\Framework\TestCase;

class EstoqueMaterialRepositoryTest extends TestCase
{
    private EstoqueMaterialRepository $repo;
    private EstoqueSaidaRepository $saidaRepo;

    protected function setUp(): void
    {
        parent::setUp();

        $conn = Database::connect();
        $check = $conn->query("SHOW TABLES LIKE 'estoque_materiais'");
        if ($check === false || $check->num_rows === 0) {
            $this->markTestSkipped('migration 073 não aplicada');
        }

        $checkSaidas = $conn->query("SHOW TABLES LIKE 'estoque_saidas'");
        if ($checkSaidas === false || $checkSaidas->num_rows === 0) {
            $this->markTestSkipped('migration 074 não aplicada');
        }

        $this->repo = new EstoqueMaterialRepository();
        $this->saidaRepo = new EstoqueSaidaRepository();
        $this->repo->beginTransaction();
    }

    protected function tearDown(): void
    {
        if (isset($this->repo)) {
            $this->repo->rollback();
        }
        parent::tearDown();
    }

    public function testEntityCalculatesTotalsAndDisponivel(): void
    {
        $entity = new EstoqueMaterial([
            'id' => 1,
            'status' => 'em_estoque',
            'material_descricao' => 'Filtro G4 500x500',
            'quantidade' => 10,
            'quantidade_baixada' => 3,
            'unidade' => 'UN',
            'preco_compra' => 50.00,
            'data_entrada' => '2026-11-01',
            'site' => 'BMADTC',
        ]);

        $arr = $entity->toArray();

        $this->assertSame(10.0, $arr['quantidade']);
        $this->assertSame(3.0, $arr['quantidade_baixada']);
        $this->assertSame(7.0, $arr['quantidade_disponivel']);
        $this->assertSame(50.0, $arr['preco_compra']);
        $this->assertSame(500.0, $arr['total_compra']);
    }

    public function testEntityHandlesZeroQuantities(): void
    {
        $entity = new EstoqueMaterial([
            'id' => 2,
            'material_descricao' => 'Cabo Flexível 2.5mm',
            'quantidade' => 5,
            'quantidade_baixada' => 5,
            'preco_compra' => 0.00,
            'data_entrada' => '2026-11-01',
            'site' => 'RJOCRT',
        ]);

        $arr = $entity->toArray();

        $this->assertSame(0.0, $arr['total_compra']);
        $this->assertSame(0.0, $arr['quantidade_disponivel']);
        $this->assertSame(5.0, $arr['quantidade_baixada']);
    }

    private function baseRow(array $over = []): array
    {
        return array_merge([
            'status' => 'em_estoque',
            'material_descricao' => 'Gás Refrigerante R410A',
            'quantidade' => 4.0,
            'unidade' => 'KG',
            'preco_compra' => 80.00,
            'data_entrada' => '2026-11-01',
            'fornecedor_nf' => 'NF 12345 Frigelar',
            'site' => 'BMADTC',
        ], $over);
    }

    public function testSaveThenGetById(): void
    {
        $id = $this->repo->save($this->baseRow(['material_descricao' => 'Sensor NTC 10k']));
        $this->assertGreaterThan(0, $id);

        $row = $this->repo->getById($id);
        $this->assertNotNull($row);
        $this->assertSame('Sensor NTC 10k', $row['material_descricao']);
        $this->assertSame('em_estoque', $row['status']);
        $this->assertEqualsWithDelta(4.0, (float) $row['quantidade'], 0.001);
        $this->assertSame('BMADTC', $row['site']);
    }

    public function testListAllWithFiltersAndPagination(): void
    {
        $this->repo->save($this->baseRow([
            'material_descricao' => 'Peça Alfa 111',
            'status' => 'em_estoque',
            'site' => 'SITE_A',
        ]));

        $this->repo->save($this->baseRow([
            'material_descricao' => 'Peça Beta 222',
            'status' => 'aplicado',
            'site' => 'SITE_B',
        ]));

        $listAll = $this->repo->listAll(10, 0, 'Peça Alfa');
        $this->assertCount(1, $listAll);
        $this->assertSame('Peça Alfa 111', $listAll[0]['material_descricao']);
    }

    public function testUpdateField(): void
    {
        $id = $this->repo->save($this->baseRow());

        $ok = $this->repo->updateField($id, 'status', 'aplicado');
        $this->assertTrue($ok);

        $row = $this->repo->getById($id);
        $this->assertSame('aplicado', $row['status']);
    }

    public function testDelete(): void
    {
        $id = $this->repo->save($this->baseRow());
        $this->assertNotNull($this->repo->getById($id));

        $ok = $this->repo->delete($id);
        $this->assertTrue($ok);
        $this->assertNull($this->repo->getById($id));
    }

    public function testGetTotals(): void
    {
        $this->repo->save($this->baseRow([
            'material_descricao' => 'Totais Item 1',
            'quantidade' => 2.0,
            'preco_compra' => 50.0,
        ]));

        $totals = $this->repo->getTotals('Totais Item 1');
        $this->assertSame(1, (int) $totals['total_lotes']);
        $this->assertEqualsWithDelta(2.0, (float) $totals['total_itens_entrada'], 0.01);
        $this->assertEqualsWithDelta(100.0, (float) $totals['total_compra'], 0.01);
    }

    public function testSaidaReducesSaldoDisponivel(): void
    {
        // 1. Cadastra entrada de 4 unidades
        $materialId = $this->repo->save($this->baseRow([
            'material_descricao' => 'Disjuntor Motor MPW40',
            'quantidade' => 4.0,
            'preco_compra' => 100.0,
        ]));

        $itemAntes = $this->repo->getById($materialId);
        $this->assertEqualsWithDelta(4.0, (float) $itemAntes['quantidade_disponivel'], 0.01);
        $this->assertEqualsWithDelta(0.0, (float) $itemAntes['quantidade_baixada'], 0.01);

        // 2. Registra primeira saída de 1 unidade para Site A
        $saida1Id = $this->saidaRepo->save([
            'estoque_material_id' => $materialId,
            'quantidade_saida' => 1.0,
            'data_saida' => '2026-11-02',
            'site' => 'Site A',
            'tecnico_nome' => 'João',
        ]);
        $this->assertGreaterThan(0, $saida1Id);

        // 3. Registra segunda saída de 2 unidades para Site B
        $saida2Id = $this->saidaRepo->save([
            'estoque_material_id' => $materialId,
            'quantidade_saida' => 2.0,
            'data_saida' => '2026-11-02',
            'site' => 'Site B',
            'tecnico_nome' => 'Maria',
        ]);
        $this->assertGreaterThan(0, $saida2Id);

        // 4. Verifica saldo após as duas saídas (4 - (1 + 2) = 1 disponível)
        $itemDepois = $this->repo->getById($materialId);
        $this->assertEqualsWithDelta(3.0, (float) $itemDepois['quantidade_baixada'], 0.01);
        $this->assertEqualsWithDelta(1.0, (float) $itemDepois['quantidade_disponivel'], 0.01);
        $this->assertSame(2, (int) $itemDepois['total_saidas']);

        // 5. Verifica saídas listadas
        $saidas = $this->saidaRepo->getByMaterialId($materialId);
        $this->assertCount(2, $saidas);
    }
}
