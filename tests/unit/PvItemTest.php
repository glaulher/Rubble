<?php

namespace Tests\Unit;

use App\Api\Entities\PvItem;
use PHPUnit\Framework\TestCase;

class PvItemTest extends TestCase
{
    public function testConstructSetsAllFields(): void
    {
        $data = [
            'id' => '1',
            'pv_id' => '5',
            'lpu_origem' => 'lpu_material_clima',
            'descricao_lpu' => 'Descrição LPU',
            'descricao' => 'Especificação do item',
            'numero_item' => '100',
            'quantidade' => '3.5',
            'valor' => '150.75',
            'valor_total' => '527.63',
            'bdi' => '40',
            'valor_flpu' => '200.00',
            'fatura' => 'flpu',
            'scm' => 'SCM-001',
            'laudo' => 'laudo123',
            'filtro_data' => '{"tamanho":"850x636mm","qtd_pecas":6,"area_placa":0.5406,"area_plana_total":3.2436,"qtd_cobrar":6}',
        ];

        $item = new PvItem($data);

        $this->assertSame(1, $item->id);
        $this->assertSame(5, $item->pvId);
        $this->assertSame('lpu_material_clima', $item->lpuOrigin);
        $this->assertSame('Descrição LPU', $item->lpuDescription);
        $this->assertSame('Especificação do item', $item->description);
        $this->assertSame(100, $item->itemNumber);
        $this->assertSame(3.5, $item->quantity);
        $this->assertSame(150.75, $item->value);
        $this->assertSame(527.63, $item->totalValue);
        $this->assertSame(40.0, $item->bdi);
        $this->assertSame(200.00, $item->flpuValue);
        $this->assertSame('flpu', $item->invoice);
        $this->assertSame('SCM-001', $item->scm);
        $this->assertSame('laudo123', $item->report);
        $this->assertSame('{"tamanho":"850x636mm","qtd_pecas":6,"area_placa":0.5406,"area_plana_total":3.2436,"qtd_cobrar":6}', $item->filterData);
    }

    public function testConstructSetsNullForMissingFields(): void
    {
        $data = ['id' => '1', 'pv_id' => '5'];

        $item = new PvItem($data);

        $this->assertNull($item->lpuOrigin);
        $this->assertNull($item->lpuDescription);
        $this->assertNull($item->description);
        $this->assertNull($item->itemNumber);
        $this->assertNull($item->quantity);
        $this->assertNull($item->value);
        $this->assertNull($item->totalValue);
        $this->assertNull($item->bdi);
        $this->assertNull($item->flpuValue);
        $this->assertNull($item->invoice);
        $this->assertNull($item->scm);
        $this->assertNull($item->report);
        $this->assertNull($item->filterData);
    }

    public function testToArrayReturnsAllFields(): void
    {
        $data = [
            'id' => '2',
            'pv_id' => '10',
            'lpu_origem' => 'lpu_civil',
            'descricao_lpu' => 'Descrição',
            'numero_item' => '200',
            'quantidade' => '1',
            'valor' => '500.00',
            'fatura' => 'lpu',
        ];

        $item = new PvItem($data);
        $result = $item->toArray();

        $expected = [
            'id' => 2,
            'pv_id' => 10,
            'lpu_origem' => 'lpu_civil',
            'descricao_lpu' => 'Descrição',
            'descricao' => null,
            'numero_item' => 200,
            'quantidade' => 1.0,
            'valor' => 500.00,
            'valor_total' => null,
            'bdi' => null,
            'valor_flpu' => null,
            'fatura' => 'lpu',
            'scm' => null,
            'laudo' => null,
            'filtro_data' => null,
            'status' => null,
            'orcamento' => null,
        ];

        $this->assertSame($expected, $result);
    }
}
