<?php

namespace Tests\Unit;

use App\Api\Repositories\SolicitacaoCompraRepository;
use App\Api\Services\SolicitacaoCompraService;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraServiceTest extends TestCase
{
    private function createMockRepo(): SolicitacaoCompraRepository
    {
        return $this->createMock(SolicitacaoCompraRepository::class);
    }

    private function service(?SolicitacaoCompraRepository $repo = null): SolicitacaoCompraService
    {
        return new SolicitacaoCompraService($repo ?? $this->createMockRepo());
    }

    private function row(array $over = []): array
    {
        return array_merge([
            'id' => 1,
            'titulo_email' => 'Cotação filtros',
            'status' => 'em_cotacao',
            'site' => 'BMADTC',
            'equipamento_id' => null,
            'equipamento_texto' => null,
            'numero_sc' => null,
            'numero_pc' => null,
            'numero_pv' => null,
            'valor_sc' => null,
            'data' => '2026-10-01',
            'data_status' => '2026-10-01',
            'sla_dias' => null,
            'observacao' => null,
            'pv_valor_total' => null,
        ], $over);
    }

    // --- status / margens / atraso ---

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

    // --- validação ---

    public function testValidateRejectsMissingTitle(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('O título da solicitação é obrigatório.');

        $this->service()->validate(['site' => 'BMADTC', 'status' => 'em_cotacao']);
    }

    public function testValidateRejectsMissingSite(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('O site é obrigatório.');

        $this->service()->validate(['titulo_email' => 'x', 'site' => '  ', 'status' => 'em_cotacao']);
    }

    public function testValidateRejectsUnknownStatus(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Status inválido.');

        $this->service()->validate(['titulo_email' => 'x', 'site' => 'BMADTC', 'status' => 'zzz']);
    }

    public function testValidateRejectsNegativeSla(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('SLA deve ser um número inteiro de dias maior ou igual a zero.');

        $this->service()->validate([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'sla_dias' => -1,
        ]);
    }

    public function testValidateRejectsNegativeValue(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Valor da SC deve ser um número maior ou igual a zero.');

        $this->service()->validate([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'valor_sc' => -5,
        ]);
    }

    public function testValidateRejectsInvalidDate(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Data inválida.');

        $this->service()->validate([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'data' => '30/10/2026',
        ]);
    }

    // --- save ---

    public function testSaveNormalizesPvNumberToDigits(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())->method('save')
            ->with($this->callback(fn ($d) => $d['numero_pv'] === '260025'))
            ->willReturn(1);

        $this->service($repo)->save([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'numero_pv' => 'PV 260025',
        ]);
    }

    public function testSaveFillsDatesWithToday(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())->method('save')
            ->with($this->callback(
                fn ($d) => $d['data'] === date('Y-m-d') && $d['data_status'] === date('Y-m-d')
            ))
            ->willReturn(1);

        $this->service($repo)->save([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
        ]);
    }

    public function testSaveRejectsDuplicateScNumber(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('existsByScNumber')->willReturn(true);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Já existe uma solicitação com esse número de SC.');

        $this->service($repo)->save([
            'titulo_email' => 'x',
            'site' => 'BMADTC',
            'status' => 'em_cotacao',
            'numero_sc' => 'SC-1',
        ]);
    }

    // --- update ---

    public function testStatusChangeSetsDataStatusToToday(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row(['status' => 'em_cotacao', 'data_status' => '2026-10-01']));
        $repo->expects($this->once())->method('update')
            ->with(1, $this->callback(fn ($d) => $d['data_status'] === date('Y-m-d')))
            ->willReturn(true);

        $this->service($repo)->update(1, ['status' => 'orcamento_recebido']);
    }

    public function testSameStatusKeepsDataStatus(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row(['status' => 'em_cotacao', 'data_status' => '2026-10-01']));
        $repo->expects($this->once())->method('update')
            ->with(1, $this->callback(fn ($d) => $d['data_status'] === '2026-10-01'))
            ->willReturn(true);

        $this->service($repo)->update(1, ['status' => 'em_cotacao']);
    }

    public function testExplicitDataStatusIsKept(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row(['status' => 'em_cotacao', 'data_status' => '2026-10-01']));
        $repo->expects($this->once())->method('update')
            ->with(1, $this->callback(fn ($d) => $d['data_status'] === '2026-10-20'))
            ->willReturn(true);

        $this->service($repo)->update(1, ['status' => 'orcamento_recebido', 'data_status' => '2026-10-20']);
    }

    public function testUpdateRejectsDuplicateScNumberOfAnotherRow(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row());
        $repo->method('existsByScNumber')->willReturn(true);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Já existe uma solicitação com esse número de SC.');

        $this->service($repo)->update(1, ['numero_sc' => 'SC-1']);
    }

    // --- updateField ---

    public function testUpdateFieldRejectsUnknownField(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Campo não editável.');

        $this->service()->updateField(1, 'id', 5);
    }

    public function testUpdateFieldStatusAlsoSetsDataStatus(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row(['status' => 'em_cotacao', 'data_status' => '2026-10-01']));
        $repo->expects($this->once())->method('update')
            ->with(1, $this->callback(
                fn ($d) => $d['status'] === 'sc_aprovada' && $d['data_status'] === date('Y-m-d')
            ))
            ->willReturn(true);

        $this->service($repo)->updateField(1, 'status', 'sc_aprovada');
    }

    public function testUpdateFieldReturnsEnrichedRow(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->row(['valor_sc' => '1000.00', 'pv_valor_total' => '1300.00']));
        $repo->method('update')->willReturn(true);

        $out = $this->service($repo)->updateField(1, 'titulo_email', 'Novo título');

        $this->assertSame(30.0, $out['markup_pct']);
        $this->assertTrue($out['steps']['em_cotacao']);
    }

    // --- listAll / enrich ---

    public function testListAllEnrichesItemsAndReturnsCounts(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            $this->row(['valor_sc' => '1000.00', 'pv_valor_total' => '1300.00']),
        ]);
        $repo->method('count')->willReturn(1);
        $repo->method('statusCounts')->willReturn(['em_cotacao' => 1]);

        $out = $this->service($repo)->listAll(500, 0, '', null, null);

        $this->assertSame(1, $out['total']);
        $this->assertSame(['em_cotacao' => 1], $out['status_counts']);
        $this->assertCount(1, $out['items']);
        $this->assertSame(23.1, $out['items'][0]['margem_pct']);
    }

    public function testEnrichAddsStepsMarginsAndOverdue(): void
    {
        $out = $this->service()->enrich([
            'status' => 'pc_gerado',
            'valor_sc' => '1000.00',
            'pv_valor_total' => '1300.00',
            'sla_dias' => 3,
            'data_status' => '2026-10-20',
        ], '2026-10-30');

        $this->assertTrue($out['steps']['pc_gerado']);
        $this->assertFalse($out['steps']['material_retirado']);
        $this->assertSame(30.0, $out['markup_pct']);
        $this->assertSame(23.1, $out['margem_pct']);
        $this->assertSame(7, $out['overdue_days']);
    }

    public function testEnrichLeavesMarginsNullWithoutPv(): void
    {
        $out = $this->service()->enrich([
            'status' => 'em_cotacao',
            'valor_sc' => '1000.00',
            'pv_valor_total' => null,
        ], '2026-10-30');

        $this->assertNull($out['markup_pct']);
        $this->assertNull($out['margem_pct']);
        $this->assertSame(0, $out['overdue_days']);
    }
}
