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
            'localidade' => 'Container 1',
            'os' => 'OS12345',
            'data' => '2026-10-22',
            'categoria' => 'corretiva',
            'status' => 'Em andamento',
            'equipe' => 'Carlos / João',
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
        $this->assertSame('Container 1', $entity->localidade);
        $this->assertSame('OS12345', $entity->os);
        $this->assertSame('2026-10-22', $entity->data);
        $this->assertSame('corretiva', $entity->categoria);
        $this->assertSame('Em andamento', $entity->status);
        $this->assertSame('Carlos / João', $entity->equipe);
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
        $this->assertSame('Container 1', $arr['localidade']);
        $this->assertSame('OS12345', $arr['os']);
        $this->assertSame('2026-10-22', $arr['data']);
        $this->assertSame('corretiva', $arr['categoria']);
        $this->assertSame('Em andamento', $arr['status']);
        $this->assertSame('Carlos / João', $arr['equipe']);
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
        $this->assertNull($entity->categoria);
        $this->assertNull($entity->status);
        $this->assertNull($entity->obs);
        $this->assertNull($entity->createdBy);
        $this->assertNull($entity->createdByName);
        $this->assertNull($entity->createdAt);
        $this->assertNull($entity->updatedAt);

        $arr = $entity->toArray();
        $this->assertNull($arr['id']);
        $this->assertNull($arr['site']);
        $this->assertNull($arr['equipamento_id']);
    }
}
