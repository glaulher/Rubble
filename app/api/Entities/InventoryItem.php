<?php

declare(strict_types=1);

namespace App\Api\Entities;

class InventoryItem
{
    public ?int $id;
    public string $categoria;
    public string $tecnicoNome;
    public string $materialNome;
    public string $modelo;
    public string $serial;
    public string $dataRetirada;
    public ?string $dataDevolucao;
    public string $status;
    public ?string $observacoes;
    public ?int $createdBy;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = isset($data['id']) ? (int) $data['id'] : null;
        $this->categoria = (string) ($data['categoria'] ?? 'ferramenta');
        $this->tecnicoNome = trim((string) ($data['tecnico_nome'] ?? ''));
        $this->materialNome = trim((string) ($data['material_nome'] ?? ''));
        $this->modelo = trim((string) ($data['modelo'] ?? ''));
        $this->serial = trim((string) ($data['serial'] ?? ''));
        $this->dataRetirada = (string) ($data['data_retirada'] ?? '');
        $this->dataDevolucao = !empty($data['data_devolucao']) ? (string) $data['data_devolucao'] : null;
        $this->status = (string) ($data['status'] ?? ($this->dataDevolucao ? 'devolvido' : 'em_posse'));
        $this->observacoes = !empty($data['observacoes']) ? trim((string) $data['observacoes']) : null;
        $this->createdBy = isset($data['created_by']) ? (int) $data['created_by'] : null;
        $this->createdAt = isset($data['created_at']) && $data['created_at'] !== null ? (string) $data['created_at'] : null;
        $this->updatedAt = isset($data['updated_at']) && $data['updated_at'] !== null ? (string) $data['updated_at'] : null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'categoria' => $this->categoria,
            'tecnico_nome' => $this->tecnicoNome,
            'material_nome' => $this->materialNome,
            'modelo' => $this->modelo,
            'serial' => $this->serial,
            'data_retirada' => $this->dataRetirada,
            'data_devolucao' => $this->dataDevolucao,
            'status' => $this->status,
            'observacoes' => $this->observacoes,
            'created_by' => $this->createdBy,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
