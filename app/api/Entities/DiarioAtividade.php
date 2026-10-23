<?php

declare(strict_types=1);

namespace App\Api\Entities;

class DiarioAtividade
{
    public ?int $id;
    public ?string $site;
    public ?int $equipamentoId;
    public ?string $equipamentoNome;
    public ?string $equipamentoCapacidade;
    public ?string $localidade;
    public ?string $os;
    public ?string $data;
    public ?string $categoria;
    public ?string $status;
    public ?string $equipe;
    public ?string $obs;
    public ?int $createdBy;
    public ?string $createdByName;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = isset($data['id']) && $data['id'] !== null ? (int) $data['id'] : null;
        $this->site = isset($data['site']) && trim((string) $data['site']) !== '' ? trim((string) $data['site']) : null;
        $this->equipamentoId = isset($data['equipamento_id']) && $data['equipamento_id'] !== null && $data['equipamento_id'] !== ''
            ? (int) $data['equipamento_id']
            : null;
        $this->equipamentoNome = isset($data['equipamento_nome']) && $data['equipamento_nome'] !== null
            ? trim((string) $data['equipamento_nome'])
            : null;
        $this->equipamentoCapacidade = isset($data['equipamento_capacidade']) && $data['equipamento_capacidade'] !== null && $data['equipamento_capacidade'] !== ''
            ? (string) (float) $data['equipamento_capacidade']
            : null;
        $this->localidade = isset($data['localidade']) && trim((string) $data['localidade']) !== '' ? trim((string) $data['localidade']) : null;
        $this->os = isset($data['os']) && trim((string) $data['os']) !== '' ? trim((string) $data['os']) : null;
        $this->data = isset($data['data']) && trim((string) $data['data']) !== '' ? trim((string) $data['data']) : null;
        $this->categoria = isset($data['categoria']) && trim((string) $data['categoria']) !== '' ? trim((string) $data['categoria']) : null;
        $this->status = isset($data['status']) && trim((string) $data['status']) !== '' ? trim((string) $data['status']) : null;
        $this->equipe = isset($data['equipe']) && trim((string) $data['equipe']) !== '' ? trim((string) $data['equipe']) : null;
        $this->obs = isset($data['obs']) && $data['obs'] !== null && trim((string) $data['obs']) !== ''
            ? (string) $data['obs']
            : null;
        $this->createdBy = isset($data['created_by']) && $data['created_by'] !== null ? (int) $data['created_by'] : null;
        $this->createdByName = isset($data['created_by_name']) && $data['created_by_name'] !== null
            ? trim((string) $data['created_by_name'])
            : null;
        $this->createdAt = isset($data['created_at']) && $data['created_at'] !== null ? (string) $data['created_at'] : null;
        $this->updatedAt = isset($data['updated_at']) && $data['updated_at'] !== null ? (string) $data['updated_at'] : null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'site' => $this->site,
            'equipamento_id' => $this->equipamentoId,
            'equipamento_nome' => $this->equipamentoNome,
            'equipamento_capacidade' => $this->equipamentoCapacidade,
            'localidade' => $this->localidade,
            'os' => $this->os,
            'data' => $this->data,
            'categoria' => $this->categoria,
            'status' => $this->status,
            'equipe' => $this->equipe,
            'obs' => $this->obs,
            'created_by' => $this->createdBy,
            'created_by_name' => $this->createdByName,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
