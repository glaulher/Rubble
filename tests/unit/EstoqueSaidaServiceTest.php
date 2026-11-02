<?php

namespace Tests\Unit;

use App\Api\Entities\EstoqueSaida;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Api\Repositories\EstoqueSaidaRepository;
use App\Api\Services\EstoqueSaidaService;
use PHPUnit\Framework\TestCase;

class EstoqueSaidaServiceTest extends TestCase
{
    public function testSaveRejectsMissingMaterial(): void
    {
        $service = new EstoqueSaidaService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Material de estoque é obrigatório.');

        $service->save([
            'site' => 'BMADTC',
            'quantidade_saida' => 1.0,
        ]);
    }

    public function testSaveRejectsMissingSite(): void
    {
        $service = new EstoqueSaidaService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Site de aplicação é obrigatório.');

        $service->save([
            'estoque_material_id' => 10,
            'quantidade_saida' => 1.0,
            'site' => '   ',
        ]);
    }

    public function testSaveRejectsZeroOrNegativeQuantity(): void
    {
        $service = new EstoqueSaidaService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Quantidade de saída deve ser maior que zero.');

        $service->save([
            'estoque_material_id' => 10,
            'site' => 'BMADTC',
            'quantidade_saida' => 0,
        ]);
    }

    public function testSaveRejectsQuantityExceedingAvailableStock(): void
    {
        $materialRepoMock = $this->createMock(EstoqueMaterialRepository::class);
        $saidaRepoMock = $this->createMock(EstoqueSaidaRepository::class);

        // Lote com apenas 2 unidades disponíveis
        $materialRepoMock->method('getById')->with(10)->willReturn([
            'id' => 10,
            'quantidade' => 4.0,
            'quantidade_disponivel' => 2.0,
            'quantidade_baixada' => 2.0,
        ]);

        $service = new EstoqueSaidaService($saidaRepoMock, $materialRepoMock);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Quantidade solicitada (3) excede o saldo disponível em estoque (2).');

        $service->save([
            'estoque_material_id' => 10,
            'site' => 'BMADTC',
            'quantidade_saida' => 3.0,
            'data_saida' => '2026-11-02',
        ]);
    }

    public function testSaveSuccessWhenWithinStock(): void
    {
        $materialRepoMock = $this->createMock(EstoqueMaterialRepository::class);
        $saidaRepoMock = $this->createMock(EstoqueSaidaRepository::class);

        $materialRepoMock->method('getById')->with(10)->willReturn([
            'id' => 10,
            'quantidade' => 4.0,
            'quantidade_disponivel' => 4.0,
            'quantidade_baixada' => 0.0,
        ]);

        $saidaRepoMock->expects($this->once())
            ->method('save')
            ->willReturn(101);

        $materialRepoMock->expects($this->once())
            ->method('syncStatus')
            ->with(10);

        $service = new EstoqueSaidaService($saidaRepoMock, $materialRepoMock);

        $id = $service->save([
            'estoque_material_id' => 10,
            'site' => 'BMADTC',
            'quantidade_saida' => 2.0,
            'data_saida' => '2026-11-02',
        ]);

        $this->assertSame(101, $id);
    }

    public function testEntityCalculatesRentabilidade(): void
    {
        $saida = new EstoqueSaida([
            'id' => 50,
            'estoque_material_id' => 10,
            'material_descricao' => 'Disjuntor Motor MPW40',
            'quantidade_saida' => 2.0,
            'unidade' => 'UN',
            'preco_compra' => 100.0,
            'preco_venda' => 150.0,
            'data_saida' => '2026-11-02',
            'site' => 'BMADTC',
        ]);

        $arr = $saida->toArray();

        $this->assertSame(2.0, $arr['quantidade_saida']);
        $this->assertSame(100.0, $arr['preco_compra']);
        $this->assertSame(200.0, $arr['total_compra']);
        $this->assertSame(150.0, $arr['preco_venda']);
        $this->assertSame(300.0, $arr['total_venda']);
        $this->assertSame(100.0, $arr['lucro_bruto']);
        $this->assertEqualsWithDelta(33.33, $arr['margem_percent'], 0.01);
        $this->assertEqualsWithDelta(50.0, $arr['markup_percent'], 0.01);
    }

    public function testDeleteSyncsMaterialStatus(): void
    {
        $materialRepoMock = $this->createMock(EstoqueMaterialRepository::class);
        $saidaRepoMock = $this->createMock(EstoqueSaidaRepository::class);

        $saidaRepoMock->method('getById')->with(101)->willReturn([
            'id' => 101,
            'estoque_material_id' => 10,
            'quantidade_saida' => 2.0,
        ]);

        $saidaRepoMock->expects($this->once())
            ->method('delete')
            ->with(101)
            ->willReturn(true);

        $materialRepoMock->expects($this->once())
            ->method('syncStatus')
            ->with(10);

        $service = new EstoqueSaidaService($saidaRepoMock, $materialRepoMock);
        $deleted = $service->delete(101);

        $this->assertTrue($deleted);
    }
}
