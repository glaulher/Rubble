<?php

namespace App\Api\Entities;

class Equipment
{
    public int $id;
    public string $location;
    public string $equipment;
    public ?string $info;
    public ?int $addressId;
    public ?string $addressLocation;
    public ?string $address;
    public ?float $capacity;
    public ?string $locality;
    public ?string $mercado;
    public ?string $localScm;

    public function __construct(array $data)
    {
        $this->id = (int) $data['id'];
        $this->location = $data['local'];
        $this->equipment = $data['equipamento'];
        $this->info = $data['info'] ?? null;
        $this->addressId = isset($data['endereco_id']) ? (int) $data['endereco_id'] : null;
        $this->addressLocation = $data['local_do_endereco'] ?? null;
        $this->address = $data['endereco'] ?? null;
        $this->capacity = isset($data['capacidade']) ? (float) $data['capacidade'] : null;
        $this->locality = $data['localidade'] ?? null;
        $this->mercado = $data['mercado'] ?? null;
        $this->localScm = $data['local_scm'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'local' => $this->location,
            'equipamento' => $this->equipment,
            'info' => $this->info,
            'endereco_id' => $this->addressId,
            'local_do_endereco' => $this->addressLocation,
            'endereco' => $this->address,
            'capacidade' => $this->capacity,
            'localidade' => $this->locality,
            'mercado' => $this->mercado,
            'local_scm' => $this->localScm,
        ];
    }
}
