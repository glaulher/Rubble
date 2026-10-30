<?php

namespace Tests\Unit;

use App\Api\Entities\SolicitacaoCompra;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraTest extends TestCase
{
    public function testToArrayExposesSnakeCaseKeys(): void
    {
        $e = new SolicitacaoCompra([
            'id' => '7',
            'titulo_email' => 'Cotação filtros',
            'status' => 'em_cotacao',
            'site' => 'BMADTC',
            'valor_sc' => '1500.50',
            'sla_dias' => '5',
        ]);

        $arr = $e->toArray();

        $this->assertSame(7, $arr['id']);
        $this->assertSame('Cotação filtros', $arr['titulo_email']);
        $this->assertSame('em_cotacao', $arr['status']);
        $this->assertSame('BMADTC', $arr['site']);
        $this->assertSame(1500.5, $arr['valor_sc']);
        $this->assertSame(5, $arr['sla_dias']);
    }

    public function testNullableFieldsStayNull(): void
    {
        $e = new SolicitacaoCompra([
            'id' => '1',
            'titulo_email' => 'x',
            'status' => 'em_cotacao',
            'site' => 'Y',
        ]);

        $arr = $e->toArray();

        $this->assertNull($arr['valor_sc']);
        $this->assertNull($arr['equipamento_id']);
        $this->assertNull($arr['numero_sc']);
        $this->assertNull($arr['data']);
        $this->assertNull($arr['sla_dias']);
    }
}
