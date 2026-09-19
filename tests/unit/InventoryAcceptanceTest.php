<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Config\Database;
use App\Api\Repositories\InventoryRepository;
use App\Api\Services\InventoryService;

class InventoryAcceptanceTest extends TestCase
{
    private \mysqli $db;
    private InventoryRepository $repo;
    private InventoryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = Database::connect();
        $this->repo = new InventoryRepository($this->db);
        $this->service = new InventoryService($this->repo);
    }

    /**
     * Critério 1: O link Inventário aparece na sidebar somente para admin, coordenador e supervisor.
     */
    public function testSidebarItemAcceptanceCriteria(): void
    {
        $indexPath = dirname(__DIR__, 2) . '/index.html';
        $this->assertFileExists($indexPath);
        $content = file_get_contents($indexPath);

        $this->assertMatchesRegularExpression(
            '/<a\s+[^>]*href="#\/inventory"[^>]*data-role="admin coordenador supervisor"[^>]*>/',
            $content,
            'Sidebar link must have href="#/inventory" and data-role="admin coordenador supervisor"'
        );

        $this->assertStringContainsString('Inventário', $content);
    }

    /**
     * Critério 2: Estrutura da tabela inventario no banco de dados e índices.
     */
    public function testDatabaseTableStructureAndIndexes(): void
    {
        $res = $this->db->query("DESCRIBE inventario");
        $this->assertNotFalse($res, "Failed to describe inventario table: " . $this->db->error);

        $columns = [];
        while ($row = $res->fetch_assoc()) {
            $columns[$row['Field']] = $row;
        }

        $expectedColumns = [
            'id',
            'categoria',
            'tecnico_nome',
            'material_nome',
            'modelo',
            'serial',
            'data_retirada',
            'data_devolucao',
            'status',
            'observacoes',
            'created_by',
            'created_at',
            'updated_at'
        ];

        foreach ($expectedColumns as $col) {
            $this->assertArrayHasKey($col, $columns, "Column $col must exist in inventario");
        }

        // Check enum values for categoria
        $this->assertStringContainsString('veiculo', $columns['categoria']['Type']);
        $this->assertStringContainsString('ferramenta', $columns['categoria']['Type']);
        $this->assertStringContainsString('celular_ti', $columns['categoria']['Type']);
        $this->assertStringContainsString('equipamento', $columns['categoria']['Type']);
        $this->assertStringContainsString('outros', $columns['categoria']['Type']);

        // Check enum values for status
        $this->assertStringContainsString('em_posse', $columns['status']['Type']);
        $this->assertStringContainsString('devolvido', $columns['status']['Type']);

        // Check indexes
        $idxRes = $this->db->query("SHOW INDEX FROM inventario");
        $this->assertNotFalse($idxRes);

        $indexes = [];
        while ($idx = $idxRes->fetch_assoc()) {
            $indexes[$idx['Key_name']] = true;
        }

        $this->assertArrayHasKey('PRIMARY', $indexes);
        $this->assertArrayHasKey('idx_inventario_status', $indexes);
        $this->assertArrayHasKey('idx_inventario_categoria', $indexes);
        $this->assertArrayHasKey('idx_inventario_tecnico', $indexes);
        $this->assertArrayHasKey('idx_inventario_serial', $indexes);
    }

    /**
     * Critério 3 & 4: Fluxo completo de cadastro de veículo, listagem por categoria/placa,
     * devolução automática e exclusão.
     */
    public function testEndToEndVehicleFlow(): void
    {
        $uniquePlaca = 'TEST-' . rand(1000, 9999);
        $techName = 'Técnico Motorista ' . rand(100, 999);

        // 1. Cadastrar veículo (em posse)
        $vehicleData = [
            'categoria' => 'veiculo',
            'tecnico_nome' => $techName,
            'material_nome' => 'Fiat Fiorino EVO',
            'modelo' => '1.4 Flex',
            'serial' => $uniquePlaca,
            'data_retirada' => '2026-09-19',
            'data_devolucao' => null,
            'observacoes' => 'Km inicial: 45.200 km, com estepe e macaco'
        ];

        $createResult = $this->service->create($vehicleData, 1);
        $this->assertTrue($createResult['success']);
        $id = $createResult['data']['id'];
        $this->assertGreaterThan(0, $id);

        try {
            // 2. Verificar se o registro aparece com status 'em_posse'
            $getRes = $this->service->get($id);
            $this->assertTrue($getRes['success']);
            $item = $getRes['data'];
            $this->assertSame('em_posse', $item['status']);
            $this->assertSame('veiculo', $item['categoria']);
            $this->assertSame($techName, $item['tecnico_nome']);
            $this->assertSame($uniquePlaca, $item['serial']);
            $this->assertNull($item['data_devolucao']);

            // 3. Filtrar por categoria 'veiculo' e verificar se o item aparece
            $listCategory = $this->service->list(['categoria' => 'veiculo', 'search' => $uniquePlaca], 10, 0);
            $this->assertTrue($listCategory['success']);
            $this->assertSame(1, $listCategory['total']);
            $this->assertSame($id, $listCategory['data'][0]['id']);

            // 4. Filtrar por categoria 'ferramenta' e verificar que NÃO aparece
            $listTool = $this->service->list(['categoria' => 'ferramenta', 'search' => $uniquePlaca], 10, 0);
            $this->assertSame(0, $listTool['total']);

            // 5. Verificar que o técnico aparece no autocomplete de técnicos
            $techRes = $this->service->getTechnicians();
            $this->assertTrue($techRes['success']);
            $this->assertContains($techName, $techRes['data']);

            // 6. Atualizar com data de devolução -> status deve mudar automaticamente para 'devolvido'
            $updateData = [
                'categoria' => 'veiculo',
                'tecnico_nome' => $techName,
                'material_nome' => 'Fiat Fiorino EVO',
                'modelo' => '1.4 Flex',
                'serial' => $uniquePlaca,
                'data_retirada' => '2026-09-19',
                'data_devolucao' => '2026-09-20',
                'observacoes' => 'Km final: 45.450 km. Sem avarias.'
            ];
            $updateRes = $this->service->update($id, $updateData);
            $this->assertTrue($updateRes['success']);

            $afterUpdate = $this->service->get($id);
            $this->assertSame('devolvido', $afterUpdate['data']['status']);
            $this->assertSame('2026-09-20', $afterUpdate['data']['data_devolucao']);

            // 7. Filtrar por status 'devolvido'
            $listDevolvido = $this->service->list(['status' => 'devolvido', 'search' => $uniquePlaca], 10, 0);
            $this->assertSame(1, $listDevolvido['total']);

            // 8. Filtrar por status 'em_posse'
            $listEmPosse = $this->service->list(['status' => 'em_posse', 'search' => $uniquePlaca], 10, 0);
            $this->assertSame(0, $listEmPosse['total']);

        } finally {
            // 9. Exclusão e limpeza
            $deleteRes = $this->service->delete($id);
            $this->assertTrue($deleteRes['success']);

            // 10. Confirmar que não existe mais
            $afterDelete = $this->service->get($id);
            $this->assertFalse($afterDelete['success']);
        }
    }

    /**
     * Validação de data de devolução anterior à retirada.
     */
    public function testDevolucaoBeforeRetiradaValidation(): void
    {
        $invalidData = [
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Técnico Inválido',
            'material_nome' => 'Martelete',
            'modelo' => 'GBH 2-24 D',
            'serial' => 'SN-INVALID',
            'data_retirada' => '2026-09-19',
            'data_devolucao' => '2026-09-10', // Anterior
        ];

        $res = $this->service->create($invalidData, 1);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('anterior', $res['message']);
    }
}
