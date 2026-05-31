<?php

namespace Tests\Unit;

use App\Api\Entities\Ticket;
use PHPUnit\Framework\TestCase;

class TicketTest extends TestCase
{
    public function testConstructSetsAllFields(): void
    {
        $data = [
            'id' => '1',
            'equipamento_id' => '5',
            'os' => 'OS-001',
            'data' => '2026-05-17',
            'equipe' => 'Equipe A',
            'status' => 'concluído',
            'material' => 'Cabo HDMI',
            'obs' => 'Observação teste',
            'data_concluido' => '2026-05-18',
            'notificacao_enviada' => '1',
            'local' => 'Sala A',
            'equipamento' => 'Notebook',
        ];

        $r = new Ticket($data);

        $this->assertSame(1, $r->id);
        $this->assertSame(5, $r->equipmentId);
        $this->assertSame('OS-001', $r->os);
        $this->assertSame('2026-05-17', $r->date);
        $this->assertSame('Equipe A', $r->team);
        $this->assertSame('concluído', $r->status);
        $this->assertSame('Cabo HDMI', $r->material);
        $this->assertSame('Observação teste', $r->notes);
        $this->assertSame('2026-05-18', $r->completionDate);
        $this->assertSame(1, $r->notificationSent);
        $this->assertSame('Sala A', $r->local);
        $this->assertSame('Notebook', $r->equipment);
    }

    public function testConstructSetsNullForMissingFields(): void
    {
        $data = [
            'id' => '1',
            'equipamento_id' => '5',
        ];

        $r = new Ticket($data);

        $this->assertNull($r->os);
        $this->assertNull($r->date);
        $this->assertNull($r->team);
        $this->assertNull($r->status);
        $this->assertNull($r->material);
        $this->assertNull($r->notes);
        $this->assertNull($r->completionDate);
        $this->assertNull($r->notificationSent);
        $this->assertNull($r->local);
        $this->assertNull($r->equipment);
    }

    public function testToArrayReturnsAllFields(): void
    {
        $data = [
            'id' => '2',
            'equipamento_id' => '10',
            'os' => 'OS-002',
            'data' => '2026-05-16',
            'equipe' => 'Equipe B',
            'status' => 'pendente',
            'material' => 'Teclado',
            'obs' => 'Troca de teclado',
            'data_concluido' => null,
            'notificacao_enviada' => '0',
            'local' => 'Sala B',
            'equipamento' => 'Desktop',
        ];

        $r = new Ticket($data);
        $result = $r->toArray();

        $expected = [
            'id' => 2,
            'equipamento_id' => 10,
            'os' => 'OS-002',
            'data' => '2026-05-16',
            'equipe' => 'Equipe B',
            'status' => 'pendente',
            'material' => 'Teclado',
            'obs' => 'Troca de teclado',
            'data_concluido' => null,
            'notificacao_enviada' => 0,
            'local' => 'Sala B',
            'equipamento' => 'Desktop',
        ];

        $this->assertSame($expected, $result);
    }

    public function testToArrayReturnsNullsForMissingOptionalFields(): void
    {
        $data = [
            'id' => '3',
            'equipamento_id' => '15',
        ];

        $r = new Ticket($data);
        $result = $r->toArray();

        $this->assertNull($result['os']);
        $this->assertNull($result['data']);
        $this->assertNull($result['equipe']);
        $this->assertNull($result['status']);
        $this->assertNull($result['material']);
        $this->assertNull($result['obs']);
        $this->assertNull($result['data_concluido']);
        $this->assertNull($result['notificacao_enviada']);
        $this->assertNull($result['local']);
        $this->assertNull($result['equipamento']);
    }
}
