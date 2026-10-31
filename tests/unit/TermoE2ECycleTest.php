<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Config\Database;
use App\Api\Repositories\TermoRepository;
use App\Api\Repositories\InventoryRepository;
use App\Api\Services\TermoService;
use mysqli;

class TermoE2ECycleTest extends TestCase
{
    private mysqli $db;
    private TermoRepository $termoRepo;
    private InventoryRepository $invRepo;
    private TermoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = Database::connect();
        $this->termoRepo = new TermoRepository($this->db);
        $this->invRepo = new InventoryRepository($this->db);
        $this->service = new TermoService($this->termoRepo, $this->invRepo);
    }

    public function testCompleteTermoLifecycleFromCreationToSignatureAndReturn(): void
    {
        // 1. Cadastrar um item no inventário (ex: Bomba de Vácuo em posse da Engemon)
        $invId = $this->invRepo->create([
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Engemon',
            'material_nome' => 'Bomba de Vácuo Teste E2E',
            'modelo' => '7 CFM Duplo Estágio',
            'serial' => 'TEST-BV-' . uniqid(),
            'data_retirada' => '2026-10-01',
            'data_devolucao' => null,
            'observacoes' => 'Ferramenta base',
        ], null);

        $this->assertGreaterThan(0, $invId, "Item do inventário deve ser criado");

        // 2. Mauro entrega a Bomba de Vácuo para o Raphael -> Criar Termo de Responsabilidade
        $createRes = $this->service->createTermo([
            'entregue_por' => 'Mauro',
            'tecnico_nome' => 'Raphael',
            'tecnico_documento' => '123.456.789-00',
            'tecnico_telefone' => '21988887777',
            'observacoes' => 'Transferência para obra Centro',
            'itens' => [
                [
                    'inventario_id' => $invId,
                    'material_nome' => 'Bomba de Vácuo Teste E2E',
                    'modelo' => '7 CFM Duplo Estágio',
                    'serial' => 'TEST-BV-123',
                ],
            ],
        ], 1);

        $this->assertTrue($createRes['success'], "Termo deve ser criado com sucesso");
        $termoId = (int) $createRes['data']['id'];
        $token = (string) $createRes['data']['token'];
        $this->assertNotEmpty($token);
        $this->assertSame(64, strlen($token));

        // 3. Raphael abre o link no celular (Public View)
        $viewRes = $this->service->getPublicTermo($token);
        $this->assertTrue($viewRes['success']);
        $this->assertFalse($viewRes['already_signed']);
        $this->assertSame('Mauro', $viewRes['data']['entregue_por']);
        $this->assertSame('Raphael', $viewRes['data']['tecnico_nome']);
        $this->assertCount(1, $viewRes['data']['itens']);

        // 4. Raphael assina digitalmente no Canvas (Public Sign)
        $fakeSignature = 'data:image/png;base64,' . base64_encode(str_repeat('PNG_FAKE_IMAGE_DATA_SAMPLE', 20));
        $signRes = $this->service->signPublicTermo($token, $fakeSignature, '192.168.1.50', 'Mobile Safari / iOS');
        $this->assertTrue($signRes['success'], "Assinatura deve ser aceita");

        // 5. Verificar se a custódia no inventário foi transferida para o Raphael (novo item clonado)
        $termoAtualizado = $this->termoRepo->findById($termoId);
        $this->assertNotEmpty($termoAtualizado->itens);
        $novoInvId = (int) $termoAtualizado->itens[0]->inventarioId;
        $this->assertGreaterThan(0, $novoInvId);

        $invItem = $this->invRepo->findById($novoInvId);
        $this->assertNotNull($invItem);
        $this->assertSame('Raphael', $invItem->tecnicoNome, "Técnico em posse deve ser Raphael");
        $this->assertSame('em_posse', $invItem->status, "Status do item no inventário deve ser em_posse");
        $this->assertNull($invItem->dataDevolucao);

        // 6. Testar Idempotência: tentar assinar novamente deve falhar com código 409
        $reSignRes = $this->service->signPublicTermo($token, $fakeSignature, '192.168.1.50', 'Mobile Safari');
        $this->assertFalse($reSignRes['success']);
        $this->assertSame(409, $reSignRes['code']);

        // 7. Raphael devolve a ferramenta -> Registrar Devolução
        $itemId = (int) $termoAtualizado->itens[0]->id;

        $devolucaoRes = $this->service->devolverItens($termoId, [$itemId], date('Y-m-d'), 'Devolvido em perfeito estado');
        $this->assertTrue($devolucaoRes['success']);

        // 8. Verificar se o status no inventário passou para devolvido
        $invItemDevolvido = $this->invRepo->findById($novoInvId);
        $this->assertSame('devolvido', $invItemDevolvido->status, "Status no inventário deve ser devolvido");
        $this->assertSame(date('Y-m-d'), $invItemDevolvido->dataDevolucao);

        // Limpeza dos dados de teste
        $this->invRepo->delete($invId);
        $this->invRepo->delete($novoInvId);
        $this->db->query("DELETE FROM termos_responsabilidade WHERE id = {$termoId}");
    }
}
