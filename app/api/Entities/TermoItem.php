<?php

declare(strict_types=1);

namespace App\Api\Entities;

class TermoItem
{
    public ?int $id;
    public ?int $termoId;
    public ?int $inventarioId;
    public string $material_nome;
    public string $modelo;
    public string $serial;
    public string $status_item;
    public ?string $dataDevolucao;
    public ?string $observacaoDevolucao;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = isset($data['id']) ? (int) $data['id'] : null;
        $this->termoId = isset($data['termo_id']) ? (int) $data['termo_id'] : null;
        $this->inventarioId = isset($data['inventario_id']) ? (int) $data['inventario_id'] : null;
        $this->material_nome = trim((string) ($data['material_nome'] ?? ''));
        $this->modelo = trim((string) ($data['modelo'] ?? ''));
        $this->serial = trim((string) ($data['serial'] ?? ''));
        $this->status_item = (string) ($data['status_item'] ?? 'em_posse');
        $this->dataDevolucao = !empty($data['data_devolucao']) ? (string) $data['data_devolucao'] : null;
        $this->observacaoDevolucao = !empty($data['observacao_devolucao']) ? trim((string) $data['observacao_devolucao']) : null;
        $this->createdAt = isset($data['created_at']) && $data['created_at'] !== null ? (string) $data['created_at'] : null;
        $this->updatedAt = isset($data['updated_at']) && $data['updated_at'] !== null ? (string) $data['updated_at'] : null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'termo_id' => $this->termoId,
            'inventario_id' => $this->inventarioId,
            'material_nome' => $this->material_nome,
            'modelo' => $this->modelo,
            'serial' => $this->serial,
            'status_item' => $this->status_item,
            'data_devolucao' => $this->dataDevolucao,
            'observacao_devolucao' => $this->observacaoDevolucao,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
