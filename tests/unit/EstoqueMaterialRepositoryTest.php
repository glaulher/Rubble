<?php

namespace Tests\Unit;

use App\Api\Entities\EstoqueMaterial;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Config\Database;
use PHPUnit\Framework\TestCase;

class EstoqueMaterialRepositoryTest extends TestCase
{
    private EstoqueMaterialRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();

        $conn = Database::connect();
        $check = $conn->query("SHOW TABLES LIKE 'estoque_materiais'");
        if ($check === false || $check->num_rows === 0) {
            $this->markTestSkipped('migration 073 não aplicada');
        }

        $this->repo = new EstoqueMaterialRepository();
        $this->repo->beginTransaction();
    }

    protected function tearDown(): void
    {
        if (isset($this->repo)) {
            $this->repo->rollback();
        }
        parent::tearDown();
    }

    public function testEntityCalculatesTotalsAndPercentages(): void
    {
        $entity = new EstoqueMaterial([
            'id' => 1,
            'status' => 'em_estoque',
            'material_descricao' => 'Filtro G4 500x500',
            'quantidade' => 10,
            'unidade' => 'UN',
            'preco_compra' => 50.00,
            'data_entrada' => '2026-11-01',
            'site' => 'BMADTC',
            'preco_venda' => 100.00,
        ]);

        $arr = $entity->toArray();

        $this->assertSame(10.0, $arr['quantidade']);
        $this->assertSame(50.0, $arr['preco_compra']);
        $this->assertSame(500.0, $arr['total_compra']);
        $this->assertSame(100.0, $arr['preco_venda']);
        $this->assertSame(1000.0, $arr['total_venda']);
        $this->assertSame(500.0, $arr['lucro_bruto']);
        $this->assertEqualsWithDelta(50.0, $arr['margem_percent'], 0.01);
        $this->assertEqualsWithDelta(100.0, $arr['markup_percent'], 0.01);
    }

    public function testEntityHandlesZeroDivisionGracefully(): void
    {
        $entity = new EstoqueMaterial([
            'id' => 2,
            'material_descricao' => 'Cabo Flexível 2.5mm',
            'quantidade' => 5,
            'preco_compra' => 0.00,
            'data_entrada' => '2026-11-01',
            'site' => 'RJOCRT',
            'preco_venda' => 0.00,
        ]);

        $arr = $entity->toArray();

        $this->assertSame(0.0, $arr['total_compra']);
        $this->assertSame(0.0, $arr['total_venda']);
        $this->assertNull($arr['margem_percent']);
        $this->assertNull($arr['markup_percent']);
    }

    public function testEntityHandlesNullPrecoVenda(): void
    {
        $entity = new EstoqueMaterial([
            'id' => 3,
            'material_descricao' => 'Contatora 3TS',
            'quantidade' => 2,
            'preco_compra' => 150.00,
            'data_entrada' => '2026-11-01',
            'site' => 'RJOCRT',
            'preco_venda' => null,
        ]);

        $arr = $entity->toArray();

        $this->assertSame(300.0, $arr['total_compra']);
        $this->assertNull($arr['total_venda']);
        $this->assertNull($arr['lucro_bruto']);
        $this->assertNull($arr['margem_percent']);
        $this->assertNull($arr['markup_percent']);
    }

    private function baseRow(array $over = []): array
    {
        return array_merge([
            'status' => 'em_estoque',
            'material_descricao' => 'Gás Refrigerante R410A',
            'quantidade' => 3.0,
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
        $this->assertEqualsWithDelta(3.0, (float) $row['quantidade'], 0.001);
        $this->assertSame('BMADTC', $row['site']);
    }

    public function testListAllWithFiltersAndPagination(): void
    {
        $this->repo->save($this->baseRow([
            'material_descricao' => 'Peça Alfa 111',
            'status' => 'em_estoque',
            'site' => 'SITE_A',
            'numero_pv' => null,
        ]));

        $this->repo->save($this->baseRow([
            'material_descricao' => 'Peça Beta 222',
            'status' => 'aplicado',
            'site' => 'SITE_B',
            'numero_pv' => '260999',
            'preco_venda' => 200.00,
        ]));

        $listAll = $this->repo->listAll(10, 0, 'Peça Alfa');
        $this->assertCount(1, $listAll);
        $this->assertSame('Peça Alfa 111', $listAll[0]['material_descricao']);

        $listComPv = $this->repo->listAll(10, 0, '', null, 'com_pv');
        $hasBeta = false;
        foreach ($listComPv as $item) {
            if ($item['material_descricao'] === 'Peça Beta 222') {
                $hasBeta = true;
            }
        }
        $this->assertTrue($hasBeta);
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
            'preco_venda' => 100.0,
        ]));

        $totals = $this->repo->getTotals('Totais Item 1');
        $this->assertSame(1, (int) $totals['total_itens']);
        $this->assertEqualsWithDelta(100.0, (float) $totals['total_compra'], 0.01);
        $this->assertEqualsWithDelta(200.0, (float) $totals['total_venda'], 0.01);
    }
}
