<?php

namespace App\Api\Entities;

class Team
{
    public ?int $id;
    public string $name;
    public bool $active;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id        = isset($data['id']) ? (int) $data['id'] : null;
        $this->name      = $data['nome'] ?? ($data['name'] ?? '');
        $this->active    = isset($data['ativo']) ? (bool) $data['ativo'] : (isset($data['active']) ? (bool) $data['active'] : true);
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id'         => $this->id,
            'nome'       => $this->name,
            'ativo'      => $this->active ? 1 : 0,
            'name'       => $this->name,
            'active'     => $this->active,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
