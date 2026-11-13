<?php

namespace Tests\Unit;

use App\Api\Services\SolicitacaoCompraService;
use App\Api\Repositories\SolicitacaoCompraRepository;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraSmNumberTest extends TestCase
{
    public function test_gera_numero_sequencial_quando_nao_ha_registros(): void
    {
        $repo = $this->createMock(SolicitacaoCompraRepository::class);
        $repo->method('getMaxNumberSm')->willReturn(null);

        $service = new SolicitacaoCompraService($repo);
        $prefix = date('y');
        $result = $service->generateNumberSm();

        $this->assertSame($prefix . '0001', $result);
    }

    public function test_gera_numero_sequencial_a_partir_do_maximo_existente(): void
    {
        $prefix = date('y');
        $repo = $this->createMock(SolicitacaoCompraRepository::class);
        $repo->method('getMaxNumberSm')->with($prefix)->willReturn($prefix . '0042');

        $service = new SolicitacaoCompraService($repo);
        $result = $service->generateNumberSm();

        $this->assertSame($prefix . '0043', $result);
    }

    public function test_numero_tem_formato_correto_6_digitos(): void
    {
        $repo = $this->createMock(SolicitacaoCompraRepository::class);
        $repo->method('getMaxNumberSm')->willReturn(null);

        $service = new SolicitacaoCompraService($repo);
        $result = $service->generateNumberSm();

        $this->assertMatchesRegularExpression('/^\d{6}$/', $result);
    }

    public function test_status_flow_contem_novos_status(): void
    {
        $this->assertContains('enviar_email', SolicitacaoCompraService::STATUS_FLOW);
        $this->assertContains('solicitada_cotacao', SolicitacaoCompraService::STATUS_FLOW);
        $this->assertContains('orcamento_recebido', SolicitacaoCompraService::STATUS_FLOW);
    }

    public function test_status_labels_contem_novos_labels(): void
    {
        $this->assertArrayHasKey('enviar_email', SolicitacaoCompraService::STATUS_LABELS);
        $this->assertArrayHasKey('solicitada_cotacao', SolicitacaoCompraService::STATUS_LABELS);
        $this->assertSame('Enviar e-mail', SolicitacaoCompraService::STATUS_LABELS['enviar_email']);
        $this->assertSame('Solicitada cotação', SolicitacaoCompraService::STATUS_LABELS['solicitada_cotacao']);
    }
}
