<?php

namespace Tests\Unit;

use App\Api\Entities\Equipment;
use PHPUnit\Framework\TestCase;

class EquipmentTest extends TestCase
{
    public function testConstructSetsAllFields(): void
    {
        $data = [
            'id' => '1',
            'local' => 'Sala A',
            'equipamento' => 'Notebook',
            'info' => 'Info test',
            'endereco_id' => '5',
            'local_do_endereco' => 'Prédio 1',
            'endereco' => 'Rua X, 123',
            'capacidade' => '150.5',
            'localidade' => 'São Paulo',
        ];

        $e = new Equipment($data);

        $this->assertSame(1, $e->id);
        $this->assertSame('Sala A', $e->location);
        $this->assertSame('Notebook', $e->equipment);
        $this->assertSame('Info test', $e->info);
        $this->assertSame(5, $e->addressId);
        $this->assertSame('Prédio 1', $e->addressLocation);
        $this->assertSame('Rua X, 123', $e->address);
        $this->assertSame(150.5, $e->capacity);
        $this->assertSame('São Paulo', $e->locality);
    }

    public function testConstructSetsNullForMissingFields(): void
    {
        $data = [
            'id' => '1',
            'local' => 'Sala A',
            'equipamento' => 'Notebook',
        ];

        $e = new Equipment($data);

        $this->assertNull($e->info);
        $this->assertNull($e->addressId);
        $this->assertNull($e->addressLocation);
        $this->assertNull($e->address);
        $this->assertNull($e->capacity);
        $this->assertNull($e->locality);
    }

    public function testToArrayReturnsAllFields(): void
    {
        $data = [
            'id' => '2',
            'local' => 'Sala B',
            'equipamento' => 'Servidor',
            'info' => 'Servidor principal',
            'endereco_id' => '10',
            'local_do_endereco' => 'Datacenter',
            'endereco' => 'Av Y, 456',
            'capacidade' => '2000.75',
            'localidade' => 'Rio de Janeiro',
        ];

        $e = new Equipment($data);
        $result = $e->toArray();

        $expected = [
            'id' => 2,
            'local' => 'Sala B',
            'equipamento' => 'Servidor',
            'info' => 'Servidor principal',
            'endereco_id' => 10,
            'local_do_endereco' => 'Datacenter',
            'endereco' => 'Av Y, 456',
            'capacidade' => 2000.75,
            'localidade' => 'Rio de Janeiro',
        ];

        $this->assertSame($expected, $result);
    }

    public function testToArrayReturnsNullsForMissingFields(): void
    {
        $data = [
            'id' => '3',
            'local' => 'Sala C',
            'equipamento' => 'Monitor',
        ];

        $e = new Equipment($data);
        $result = $e->toArray();

        $this->assertNull($result['info']);
        $this->assertNull($result['endereco_id']);
        $this->assertNull($result['local_do_endereco']);
        $this->assertNull($result['endereco']);
        $this->assertNull($result['capacidade']);
        $this->assertNull($result['localidade']);
    }
}
