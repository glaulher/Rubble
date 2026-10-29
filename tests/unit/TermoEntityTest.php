<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Entities\TermoResponsabilidade;
use App\Api\Entities\TermoItem;

class TermoEntityTest extends TestCase
{
    public function testTermoResponsabilidadeEntityHydrationAndToArray(): void
    {
        $data = [
            'id' => 1,
            'codigo' => 'TR-2026-0001',
            'emissor_id' => 2,
            'entregue_por' => 'Mauro',
            'tecnico_nome' => 'Raphael',
            'tecnico_documento' => '123.456.789-00',
            'tecnico_telefone' => '21999999999',
            'status' => 'pendente',
            'token_assinatura' => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            'token_expira_em' => '2026-11-05 18:00:00',
            'assinatura_imagem' => null,
            'assinado_em' => null,
            'assinado_ip' => null,
            'assinado_user_agent' => null,
            'observacoes' => 'Entregue com manual',
            'created_at' => '2026-10-29 18:00:00',
            'updated_at' => '2026-10-29 18:00:00',
        ];
        $termo = new TermoResponsabilidade($data);
        $this->assertSame('TR-2026-0001', $termo->codigo);
        $this->assertSame('Mauro', $termo->entregue_por);
        $this->assertSame('Raphael', $termo->tecnico_nome);
        $this->assertSame('pendente', $termo->status);
        $array = $termo->toArray();
        $this->assertSame(1, $array['id']);
        $this->assertSame('TR-2026-0001', $array['codigo']);
    }

    public function testTermoItemEntityHydrationAndToArray(): void
    {
        $data = [
            'id' => 10,
            'termo_id' => 1,
            'inventario_id' => 5,
            'material_nome' => 'Bomba de Vácuo',
            'modelo' => '7 CFM',
            'serial' => 'BV-1234',
            'status_item' => 'em_posse',
            'data_devolucao' => null,
            'observacao_devolucao' => null,
            'created_at' => '2026-10-29 18:00:00',
            'updated_at' => '2026-10-29 18:00:00',
        ];
        $item = new TermoItem($data);
        $this->assertSame('Bomba de Vácuo', $item->material_nome);
        $this->assertSame('BV-1234', $item->serial);
        $this->assertSame('em_posse', $item->status_item);
        $array = $item->toArray();
        $this->assertSame(10, $array['id']);
    }
}
