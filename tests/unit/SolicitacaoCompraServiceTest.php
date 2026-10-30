<?php

namespace Tests\Unit;

use App\Api\Services\SolicitacaoCompraService;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraServiceTest extends TestCase
{
    public function testStatusIndexAndSteps(): void
    {
        $this->assertSame(0, SolicitacaoCompraService::statusIndex('em_cotacao'));
        $this->assertSame(3, SolicitacaoCompraService::statusIndex('sc_aprovada'));
        $this->assertSame(-1, SolicitacaoCompraService::statusIndex('inventado'));

        $steps = SolicitacaoCompraService::stepsFor('sc_solicitada');
        $this->assertTrue($steps['em_cotacao']);
        $this->assertTrue($steps['orcamento_recebido']);
        $this->assertTrue($steps['sc_solicitada']);
        $this->assertFalse($steps['sc_aprovada']);
        $this->assertFalse($steps['material_retirado']);
    }

    public function testStepsForUnknownStatusMarksNothing(): void
    {
        $steps = SolicitacaoCompraService::stepsFor('inventado');

        $this->assertCount(6, $steps);
        $this->assertSame([], array_keys(array_filter($steps)));
    }

    public function testComputeMargins(): void
    {
        $this->assertSame(
            ['markup_pct' => 30.0, 'margem_pct' => 23.1],
            SolicitacaoCompraService::computeMargins(1000.0, 1300.0)
        );
    }

    public function testNegativeMarginsWhenPvIsLowerThanSc(): void
    {
        $margins = SolicitacaoCompraService::computeMargins(1000.0, 800.0);

        $this->assertSame(-20.0, $margins['markup_pct']);
        $this->assertSame(-25.0, $margins['margem_pct']);
    }

    public function testMarginsAreNullWhenDivisorIsZeroOrMissing(): void
    {
        $this->assertSame(
            ['markup_pct' => null, 'margem_pct' => null],
            SolicitacaoCompraService::computeMargins(null, 1300.0)
        );
        $this->assertSame(
            ['markup_pct' => null, 'margem_pct' => null],
            SolicitacaoCompraService::computeMargins(1000.0, null)
        );
        $this->assertNull(SolicitacaoCompraService::computeMargins(0.0, 1300.0)['markup_pct']);
        $this->assertNull(SolicitacaoCompraService::computeMargins(1000.0, 0.0)['margem_pct']);
    }

    public function testOverdueDaysIsStrictlyGreaterThanSla(): void
    {
        $row = ['sla_dias' => 3, 'data_status' => '2026-10-25'];

        $this->assertSame(2, SolicitacaoCompraService::overdueDays($row, '2026-10-30'));
        $this->assertSame(0, SolicitacaoCompraService::overdueDays($row, '2026-10-28'));
        $this->assertSame(0, SolicitacaoCompraService::overdueDays(
            ['sla_dias' => null, 'data_status' => '2026-01-01'],
            '2026-10-30'
        ));
        $this->assertSame(0, SolicitacaoCompraService::overdueDays(
            ['sla_dias' => 3, 'data_status' => null],
            '2026-10-30'
        ));
    }
}
