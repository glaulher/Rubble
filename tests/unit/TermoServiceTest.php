<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Services\TermoService;
use App\Api\Repositories\TermoRepository;
use App\Api\Repositories\InventoryRepository;
use App\Api\Entities\TermoResponsabilidade;

class TermoServiceTest extends TestCase
{
    private TermoService $service;
    private $termoRepoMock;
    private $inventoryRepoMock;

    protected function setUp(): void
    {
        $this->termoRepoMock = $this->createMock(TermoRepository::class);
        $this->inventoryRepoMock = $this->createMock(InventoryRepository::class);
        $this->service = new TermoService($this->termoRepoMock, $this->inventoryRepoMock);
    }

    public function testValidationFailsIfRequiredFieldsMissing(): void
    {
        $res = $this->service->createTermo([], 1);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('obrigatórios', $res['message']);
    }

    public function testValidationFailsIfItensEmpty(): void
    {
        $data = [
            'entregue_por' => 'Mauro',
            'tecnico_nome' => 'Raphael',
            'itens' => [],
        ];
        $res = $this->service->createTermo($data, 1);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('pelo menos uma ferramenta', $res['message']);
    }

    public function testCreateTermoSuccessGeneratesCodeAndToken(): void
    {
        $data = [
            'entregue_por' => 'Mauro',
            'tecnico_nome' => 'Raphael',
            'tecnico_telefone' => '21999999999',
            'itens' => [
                ['material_nome' => 'Bomba de Vácuo', 'modelo' => '7 CFM', 'serial' => 'BV-01'],
            ],
        ];

        $this->termoRepoMock->expects($this->once())
            ->method('generateNextCode')
            ->willReturn('TR-2026-0001');

        $this->termoRepoMock->expects($this->once())
            ->method('create')
            ->willReturn(1);

        $res = $this->service->createTermo($data, 1);
        $this->assertTrue($res['success']);
        $this->assertSame('TR-2026-0001', $res['data']['codigo']);
        $this->assertSame(64, strlen($res['data']['token']));
    }

    public function testGetPublicTermoFailsIfNotFound(): void
    {
        $token = str_repeat('a', 64);
        $this->termoRepoMock->expects($this->once())
            ->method('findByToken')
            ->with($token)
            ->willReturn(null);

        $res = $this->service->getPublicTermo($token);
        $this->assertFalse($res['success']);
        $this->assertSame(404, $res['code']);
    }

    public function testGetPublicTermoFailsIfExpired(): void
    {
        $token = str_repeat('a', 64);
        $termo = new TermoResponsabilidade([
            'id' => 1,
            'codigo' => 'TR-2026-0001',
            'entregue_por' => 'Mauro',
            'tecnico_nome' => 'Raphael',
            'token_assinatura' => $token,
            'token_expira_em' => date('Y-m-d H:i:s', strtotime('-1 day')),
            'status' => 'pendente',
        ]);

        $this->termoRepoMock->expects($this->once())
            ->method('findByToken')
            ->with($token)
            ->willReturn($termo);

        $res = $this->service->getPublicTermo($token);
        $this->assertFalse($res['success']);
        $this->assertSame(410, $res['code']);
    }

    public function testSignPublicTermoRejectsEmptySignature(): void
    {
        $token = str_repeat('a', 64);
        $res = $this->service->signPublicTermo($token, '', '127.0.0.1', 'Mozilla');
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('Assinatura inválida', $res['message']);
    }
}
