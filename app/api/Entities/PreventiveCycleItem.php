<?php

namespace App\Api\Entities;

class PreventiveCycleItem
{
    public int $id;
    public string $ciclo;
    public int $equipamentoId;
    public ?string $observacao;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = (int) ($data['id'] ?? 0);
        $this->ciclo = $data['ciclo'] ?? '';
        $this->equipamentoId = (int) ($data['equipamento_id'] ?? 0);
        $this->observacao = $data['observacao'] ?? null;
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'ciclo' => $this->ciclo,
            'equipamento_id' => $this->equipamentoId,
            'observacao' => $this->observacao,
        ];
    }
}
