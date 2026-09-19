<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Repositories\InventoryRepository;
use App\Api\Entities\InventoryItem;

class InventoryRepositoryTest extends TestCase
{
    private InventoryRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new InventoryRepository();
        $this->repo->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->repo->rollback();
        parent::tearDown();
    }

    public function testCreateAndFindById(): void
    {
        $data = [
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Técnico Teste Unit',
            'material_nome' => 'Furadeira de Impacto',
            'modelo' => 'DCD776',
            'serial' => 'SN-FUR-999',
            'data_retirada' => '2026-09-19',
            'data_devolucao' => null,
            'observacoes' => 'Entregue com maleta',
        ];

        $id = $this->repo->create($data, 1);
        $this->assertGreaterThan(0, $id);

        $item = $this->repo->findById($id);
        $this->assertNotNull($item);
        $this->assertInstanceOf(InventoryItem::class, $item);
        $this->assertSame($id, $item->id);
        $this->assertSame('ferramenta', $item->categoria);
        $this->assertSame('Técnico Teste Unit', $item->tecnicoNome);
        $this->assertSame('Furadeira de Impacto', $item->materialNome);
        $this->assertSame('DCD776', $item->modelo);
        $this->assertSame('SN-FUR-999', $item->serial);
        $this->assertSame('2026-09-19', $item->dataRetirada);
        $this->assertNull($item->dataDevolucao);
        $this->assertSame('em_posse', $item->status);
        $this->assertSame('Entregue com maleta', $item->observacoes);
        $this->assertSame(1, $item->createdBy);
    }

    public function testCreateWithDevolucaoSetsStatusDevolvido(): void
    {
        $data = [
            'categoria' => 'veiculo',
            'tecnico_nome' => 'Técnico Devolução',
            'material_nome' => 'Fiat Strada',
            'modelo' => 'Endurance',
            'serial' => 'DEV-1234',
            'data_retirada' => '2026-09-10',
            'data_devolucao' => '2026-09-15',
            'observacoes' => 'Devolvido sem avarias',
        ];

        $id = $this->repo->create($data, null);
        $this->assertGreaterThan(0, $id);

        $item = $this->repo->findById($id);
        $this->assertNotNull($item);
        $this->assertSame('devolvido', $item->status);
        $this->assertSame('2026-09-15', $item->dataDevolucao);
    }

    public function testFindByIdReturnsNullForNonExistent(): void
    {
        $item = $this->repo->findById(99999999);
        $this->assertNull($item);
    }

    public function testUpdate(): void
    {
        $id = $this->repo->create([
            'categoria' => 'celular_ti',
            'tecnico_nome' => 'Técnico TI',
            'material_nome' => 'Samsung Galaxy',
            'modelo' => 'A15',
            'serial' => 'SN-TI-111',
            'data_retirada' => '2026-09-18',
            'data_devolucao' => null,
            'observacoes' => 'Linha corporativa',
        ], null);

        $updateData = [
            'categoria' => 'celular_ti',
            'tecnico_nome' => 'Técnico TI Modificado',
            'material_nome' => 'Samsung Galaxy 5G',
            'modelo' => 'A15 5G',
            'serial' => 'SN-TI-111-UPD',
            'data_retirada' => '2026-09-18',
            'data_devolucao' => '2026-09-19',
            'observacoes' => 'Devolvido no fim do turno',
        ];

        $success = $this->repo->update($id, $updateData);
        $this->assertTrue($success);

        $updated = $this->repo->findById($id);
        $this->assertNotNull($updated);
        $this->assertSame('Técnico TI Modificado', $updated->tecnicoNome);
        $this->assertSame('Samsung Galaxy 5G', $updated->materialNome);
        $this->assertSame('devolvido', $updated->status);
        $this->assertSame('2026-09-19', $updated->dataDevolucao);
        $this->assertSame('Devolvido no fim do turno', $updated->observacoes);
    }

    public function testDelete(): void
    {
        $id = $this->repo->create([
            'categoria' => 'outros',
            'tecnico_nome' => 'Técnico Para Deletar',
            'material_nome' => 'Item Descartavel',
            'modelo' => 'N/A',
            'serial' => 'DEL-000',
            'data_retirada' => '2026-09-19',
            'data_devolucao' => null,
            'observacoes' => null,
        ], null);

        $this->assertNotNull($this->repo->findById($id));

        $deleted = $this->repo->delete($id);
        $this->assertTrue($deleted);

        $this->assertNull($this->repo->findById($id));
    }

    public function testListAndCountWithFilters(): void
    {
        $uniqueSuffix = bin2hex(random_bytes(4));
        $techName = 'FiltroTech_' . $uniqueSuffix;
        $matName = 'Osciloscopio_' . $uniqueSuffix;
        $serial = 'OSC-' . $uniqueSuffix;

        $id1 = $this->repo->create([
            'categoria' => 'equipamento',
            'tecnico_nome' => $techName,
            'material_nome' => $matName,
            'modelo' => 'ModelX',
            'serial' => $serial,
            'data_retirada' => '2026-09-01',
            'data_devolucao' => null,
            'observacoes' => 'Teste busca',
        ], 1);

        $id2 = $this->repo->create([
            'categoria' => 'veiculo',
            'tecnico_nome' => $techName,
            'material_nome' => 'Fiorino_' . $uniqueSuffix,
            'modelo' => 'Fiat',
            'serial' => 'CAR-' . $uniqueSuffix,
            'data_retirada' => '2026-09-02',
            'data_devolucao' => '2026-09-05',
            'observacoes' => 'Outro teste',
        ], 1);

        // Search by unique tech name
        $items = $this->repo->list(['search' => $techName], 10, 0);
        $count = $this->repo->count(['search' => $techName]);
        $this->assertSame(2, $count);
        $this->assertCount(2, $items);
        $this->assertIsArray($items[0]);
        $this->assertArrayHasKey('tecnico_nome', $items[0]);

        // Filter by categoria
        $itemsEquip = $this->repo->list(['search' => $techName, 'categoria' => 'equipamento'], 10, 0);
        $countEquip = $this->repo->count(['search' => $techName, 'categoria' => 'equipamento']);
        $this->assertSame(1, $countEquip);
        $this->assertCount(1, $itemsEquip);
        $this->assertSame($id1, $itemsEquip[0]['id']);

        // Filter by status
        $itemsDevolvido = $this->repo->list(['search' => $techName, 'status' => 'devolvido'], 10, 0);
        $countDevolvido = $this->repo->count(['search' => $techName, 'status' => 'devolvido']);
        $this->assertSame(1, $countDevolvido);
        $this->assertCount(1, $itemsDevolvido);
        $this->assertSame($id2, $itemsDevolvido[0]['id']);

        $itemsEmPosse = $this->repo->list(['search' => $techName, 'status' => 'em_posse'], 10, 0);
        $countEmPosse = $this->repo->count(['search' => $techName, 'status' => 'em_posse']);
        $this->assertSame(1, $countEmPosse);
        $this->assertCount(1, $itemsEmPosse);
        $this->assertSame($id1, $itemsEmPosse[0]['id']);

        // Search by serial
        $itemsSerial = $this->repo->list(['search' => $serial], 10, 0);
        $this->assertCount(1, $itemsSerial);
        $this->assertSame($id1, $itemsSerial[0]['id']);
    }

    public function testListPagination(): void
    {
        $uniqueSuffix = bin2hex(random_bytes(4));
        $tech = 'PagTech_' . $uniqueSuffix;

        for ($i = 1; $i <= 5; $i++) {
            $this->repo->create([
                'categoria' => 'ferramenta',
                'tecnico_nome' => $tech,
                'material_nome' => "Item $i",
                'modelo' => 'M',
                'serial' => "S$i-$uniqueSuffix",
                'data_retirada' => '2026-09-01',
                'data_devolucao' => null,
                'observacoes' => null,
            ], 1);
        }

        $page1 = $this->repo->list(['search' => $tech], 2, 0);
        $page2 = $this->repo->list(['search' => $tech], 2, 2);
        $page3 = $this->repo->list(['search' => $tech], 2, 4);

        $this->assertCount(2, $page1);
        $this->assertCount(2, $page2);
        $this->assertCount(1, $page3);

        $this->assertNotSame($page1[0]['id'], $page2[0]['id']);
        $this->assertNotSame($page2[0]['id'], $page3[0]['id']);
    }

    public function testGetDistinctTechnicians(): void
    {
        $uniqueSuffix = bin2hex(random_bytes(4));
        $tech = 'DistinctTech_' . $uniqueSuffix;

        $this->repo->create([
            'categoria' => 'ferramenta',
            'tecnico_nome' => $tech,
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN-AL-' . $uniqueSuffix,
            'data_retirada' => '2026-09-01',
            'data_devolucao' => null,
            'observacoes' => null,
        ], 1);

        $technicians = $this->repo->getDistinctTechnicians();
        $this->assertIsArray($technicians);
        $this->assertContains($tech, $technicians);
    }

    public function testSqlInjectionSafetyInSearch(): void
    {
        $uniqueSuffix = bin2hex(random_bytes(4));
        $tech = 'SafeTech_' . $uniqueSuffix;

        $this->repo->create([
            'categoria' => 'ferramenta',
            'tecnico_nome' => $tech,
            'material_nome' => 'Chave de Fenda',
            'modelo' => 'CF-1',
            'serial' => 'SN-' . $uniqueSuffix,
            'data_retirada' => '2026-09-01',
            'data_devolucao' => null,
            'observacoes' => null,
        ], 1);

        // SQL injection payload in search filter
        $injection = "' OR '1'='1";
        $results = $this->repo->list(['search' => $injection]);
        $this->assertIsArray($results);
        // It shouldn't crash or return all rows blindly
        $count = $this->repo->count(['search' => $injection]);
        $this->assertIsInt($count);
    }
}
