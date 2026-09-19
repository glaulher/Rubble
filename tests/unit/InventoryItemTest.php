<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Entities\InventoryItem;

class InventoryItemTest extends TestCase
{
    public function testInstantiationAndToArray(): void
    {
        $data = [
            'id' => 1,
            'categoria' => 'veiculo',
            'tecnico_nome' => 'Carlos Silva',
            'material_nome' => 'Fiat Strada',
            'modelo' => 'Endurance 1.4',
            'serial' => 'BRA-2E19',
            'data_retirada' => '2026-09-19',
            'data_devolucao' => null,
            'status' => 'em_posse',
            'observacoes' => 'Veículo entregue limpo',
            'created_by' => 2,
            'created_at' => '2026-09-19 10:00:00',
            'updated_at' => '2026-09-19 10:00:00',
        ];

        $item = new InventoryItem($data);
        $this->assertSame(1, $item->id);
        $this->assertSame('veiculo', $item->categoria);
        $this->assertSame('Carlos Silva', $item->tecnicoNome);
        $this->assertSame('Fiat Strada', $item->materialNome);
        $this->assertSame('BRA-2E19', $item->serial);
        $this->assertSame('em_posse', $item->status);
        $this->assertNull($item->dataDevolucao);

        $array = $item->toArray();
        $this->assertSame('Carlos Silva', $array['tecnico_nome']);
        $this->assertSame('veiculo', $array['categoria']);
    }

    public function testDefaultValues(): void
    {
        $item = new InventoryItem([]);
        $this->assertNull($item->id);
        $this->assertSame('ferramenta', $item->categoria);
        $this->assertSame('', $item->tecnicoNome);
        $this->assertSame('', $item->materialNome);
        $this->assertSame('', $item->modelo);
        $this->assertSame('', $item->serial);
        $this->assertSame('', $item->dataRetirada);
        $this->assertNull($item->dataDevolucao);
        $this->assertSame('em_posse', $item->status);
        $this->assertNull($item->observacoes);
        $this->assertNull($item->createdBy);
        $this->assertNull($item->createdAt);
        $this->assertNull($item->updatedAt);

        $array = $item->toArray();
        $this->assertNull($array['id']);
        $this->assertSame('ferramenta', $array['categoria']);
        $this->assertSame('', $array['tecnico_nome']);
    }

    public function testInferredStatusWhenReturned(): void
    {
        $item = new InventoryItem(['data_devolucao' => '2026-09-20']);
        $this->assertSame('devolvido', $item->status);
        $this->assertSame('2026-09-20', $item->dataDevolucao);
    }
}
