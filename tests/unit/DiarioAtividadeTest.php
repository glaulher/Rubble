<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Entities\DiarioAtividade;

class DiarioAtividadeTest extends TestCase
{
    public function testInstantiationAndToArray(): void
    {
        $data = [
            'id' => 10,
            'site' => 'BMA',
            'equipamento_id' => 5,
            'equipamento_nome' => 'WM 01',
            'equipamento_capacidade' => '5.00',
            'localidade' => 'Container 1',
            'os' => 'OS12345',
            'data' => '2026-10-22',
            'hora_inicio' => '08:30:00',
            'hora_saida' => '17:15:00',
            'categoria' => 'emergencial',
            'status' => 'Em andamento',
            'equipe' => 'Carlos / João',
            'tecnico' => 'Carlos Alberto da Silva',
            'placa' => 'TBO-9J41',
            'obs' => '[22/10/2026 20:00] Admin (admin): Teste',
            'created_by' => 1,
            'created_by_name' => 'Admin User',
            'created_at' => '2026-10-22 20:00:00',
            'updated_at' => '2026-10-22 20:05:00',
        ];

        $entity = new DiarioAtividade($data);

        $this->assertSame(10, $entity->id);
        $this->assertSame('BMA', $entity->site);
        $this->assertSame(5, $entity->equipamentoId);
        $this->assertSame('WM 01', $entity->equipamentoNome);
        $this->assertSame('5', $entity->equipamentoCapacidade);
        $this->assertSame('Container 1', $entity->localidade);
        $this->assertSame('OS12345', $entity->os);
        $this->assertSame('2026-10-22', $entity->data);
        $this->assertSame('08:30', $entity->horaInicio);
        $this->assertSame('17:15', $entity->horaSaida);
        $this->assertSame('emergencial', $entity->categoria);
        $this->assertSame('Em andamento', $entity->status);
        $this->assertSame('Carlos / João', $entity->equipe);
        $this->assertSame('Carlos Alberto da Silva', $entity->tecnico);
        $this->assertSame('TBO-9J41', $entity->placa);
        $this->assertSame('[22/10/2026 20:00] Admin (admin): Teste', $entity->obs);
        $this->assertSame(1, $entity->createdBy);
        $this->assertSame('Admin User', $entity->createdByName);
        $this->assertSame('2026-10-22 20:00:00', $entity->createdAt);
        $this->assertSame('2026-10-22 20:05:00', $entity->updatedAt);

        $arr = $entity->toArray();
        $this->assertSame(10, $arr['id']);
        $this->assertSame('BMA', $arr['site']);
        $this->assertSame(5, $arr['equipamento_id']);
        $this->assertSame('WM 01', $arr['equipamento_nome']);
        $this->assertSame('5', $arr['equipamento_capacidade']);
        $this->assertSame('Container 1', $arr['localidade']);
        $this->assertSame('OS12345', $arr['os']);
        $this->assertSame('2026-10-22', $arr['data']);
        $this->assertSame('08:30', $arr['hora_inicio']);
        $this->assertSame('17:15', $arr['hora_saida']);
        $this->assertSame('emergencial', $arr['categoria']);
        $this->assertSame('Em andamento', $arr['status']);
        $this->assertSame('Carlos / João', $arr['equipe']);
        $this->assertSame('Carlos Alberto da Silva', $arr['tecnico']);
        $this->assertSame('TBO-9J41', $arr['placa']);
        $this->assertSame('[22/10/2026 20:00] Admin (admin): Teste', $arr['obs']);
        $this->assertSame(1, $arr['created_by']);
        $this->assertSame('Admin User', $arr['created_by_name']);
        $this->assertSame('2026-10-22 20:00:00', $arr['created_at']);
        $this->assertSame('2026-10-22 20:05:00', $arr['updated_at']);
    }

    public function testDefaultValues(): void
    {
        $entity = new DiarioAtividade([]);

        $this->assertNull($entity->id);
        $this->assertNull($entity->site);
        $this->assertNull($entity->equipamentoId);
        $this->assertNull($entity->equipamentoNome);
        $this->assertNull($entity->localidade);
        $this->assertNull($entity->os);
        $this->assertNull($entity->data);
        $this->assertNull($entity->horaInicio);
        $this->assertNull($entity->horaSaida);
        $this->assertNull($entity->categoria);
        $this->assertNull($entity->status);
        $this->assertNull($entity->equipe);
        $this->assertNull($entity->tecnico);
        $this->assertNull($entity->placa);
        $this->assertNull($entity->obs);
        $this->assertNull($entity->createdBy);
        $this->assertNull($entity->createdByName);
        $this->assertNull($entity->createdAt);
        $this->assertNull($entity->updatedAt);

        $arr = $entity->toArray();
        $this->assertNull($arr['id']);
        $this->assertNull($arr['site']);
        $this->assertNull($arr['equipamento_id']);
        $this->assertNull($arr['hora_inicio']);
        $this->assertNull($arr['hora_saida']);
        $this->assertNull($arr['equipe']);
        $this->assertNull($arr['tecnico']);
        $this->assertNull($arr['placa']);
    }
}
