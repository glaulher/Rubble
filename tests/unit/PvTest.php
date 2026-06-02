<?php

namespace Tests\Unit;

use App\Api\Entities\Pv;
use PHPUnit\Framework\TestCase;

class PvTest extends TestCase
{
    public function testConstructSetsAllFields(): void
    {
        $data = [
            'id' => '1',
            'numero_pv' => '26001',
            'data' => '2026-05-17',
            'ciclo' => '2026-05',
            'local' => 'Sala A',
            'ral' => 'RAL-001',
            'uf' => 'RJ',
            'equipamento_id' => '5',
            'equipamento' => 'Notebook',
            'localidade' => 'Container 1',
            'created_at' => '2026-05-17 10:00:00',
            'updated_at' => '2026-05-17 11:00:00',
            'valor_total' => '1500.50',
            'itens_count' => '3',
            'worst_status' => 'Aprovado serv.',
        ];

        $pv = new Pv($data);

        $this->assertSame(1, $pv->id);
        $this->assertSame('26001', $pv->numberPv);
        $this->assertSame('2026-05-17', $pv->date);
        $this->assertSame('2026-05', $pv->cycle);
        $this->assertSame('Sala A', $pv->location);
        $this->assertSame('RAL-001', $pv->ral);
        $this->assertSame('RJ', $pv->uf);
        $this->assertSame(5, $pv->equipmentId);
        $this->assertSame('Notebook', $pv->equipment);
        $this->assertSame('Container 1', $pv->locality);
        $this->assertSame('2026-05-17 10:00:00', $pv->createdAt);
        $this->assertSame('2026-05-17 11:00:00', $pv->updatedAt);
        $this->assertSame(1500.50, $pv->totalValue);
        $this->assertSame(3, $pv->itemsCount);
        $this->assertSame('Aprovado serv.', $pv->worstStatus);
    }

    public function testConstructSetsDefaultsForMissingFields(): void
    {
        $data = [
            'id' => '1',
            'numero_pv' => '26001',
            'local' => 'Sala A',
            'equipamento_id' => '0',
        ];

        $pv = new Pv($data);

        $this->assertNull($pv->date);
        $this->assertNull($pv->cycle);
        $this->assertNull($pv->ral);
        $this->assertNull($pv->uf);
        $this->assertSame(0, $pv->equipmentId);
        $this->assertNull($pv->equipment);
        $this->assertNull($pv->locality);
        $this->assertNull($pv->totalValue);
        $this->assertNull($pv->itemsCount);
        $this->assertNull($pv->worstStatus);
    }

    public function testToArrayReturnsAllFields(): void
    {
        $data = [
            'id' => '2',
            'numero_pv' => '26002',
            'data' => '2026-05-18',
            'ciclo' => '2026-06',
            'local' => 'Sala B',
            'worst_status' => 'SCM aprovado',
            'ral' => 'RAL-002',
            'uf' => 'ES',
            'equipamento_id' => '10',
            'equipamento' => 'Servidor',
        ];

        $pv = new Pv($data);
        $result = $pv->toArray();

        $expected = [
            'id' => 2,
            'numero_pv' => '26002',
            'data' => '2026-05-18',
            'ciclo' => '2026-06',
            'local' => 'Sala B',
            'worst_status' => 'SCM aprovado',
            'os' => '',
            'ral' => 'RAL-002',
            'uf' => 'ES',
            'equipamento_id' => 10,
            'equipamento' => 'Servidor',
            'capacidade' => null,
            'localidade' => null,
            'local_do_endereco' => null,
            'tickets' => [],
            'created_at' => null,
            'updated_at' => null,
        ];

        $this->assertSame($expected, $result);
    }

    public function testToArrayWithTickets(): void
    {
        $data = ['id' => '3', 'numero_pv' => '26003', 'local' => 'Sala C', 'equipamento_id' => '5'];
        $pv = new Pv($data);
        $pv->tickets = [['id' => 1, 'os' => '123456'], ['id' => 2, 'os' => '789012']];

        $result = $pv->toArray();

        $this->assertSame('123456, 789012', $result['os']);
        $this->assertCount(2, $result['tickets']);
    }

    public function testToArrayIncludesItemsWhenPresent(): void
    {
        $data = ['id' => '1', 'numero_pv' => '26001', 'local' => 'Sala A', 'equipamento_id' => '5'];

        $pv = new Pv($data);
        $pv->items = [
            new \App\Api\Entities\PvItem(['id' => '1', 'pv_id' => '1', 'quantidade' => '2', 'valor' => '100', 'fatura' => 'lpu']),
        ];

        $result = $pv->toArray();

        $this->assertArrayHasKey('itens', $result);
        $this->assertCount(1, $result['itens']);
        $this->assertSame(2.0, $result['itens'][0]['quantidade']);
    }

    public function testToArrayIncludesTotalValueWhenPresent(): void
    {
        $data = ['id' => '1', 'numero_pv' => '26001', 'local' => 'Sala A', 'equipamento_id' => '5'];
        $pv = new Pv($data);

        $result = $pv->toArray();
        $this->assertArrayNotHasKey('valor_total', $result);

        $pv->totalValue = 2500.00;
        $result = $pv->toArray();
        $this->assertSame(2500.00, $result['valor_total']);
    }

    public function testFromRowCreatesPvWithItems(): void
    {
        $row = ['id' => '1', 'numero_pv' => '26001', 'local' => 'Sala A', 'equipamento_id' => '5'];
        $itens = [
            new \App\Api\Entities\PvItem(['id' => '1', 'pv_id' => '1', 'fatura' => 'lpu']),
        ];

        $pv = Pv::fromRow($row, $itens);

        $this->assertSame(1, $pv->id);
        $this->assertCount(1, $pv->items);
    }
}
