<?php

namespace App\Api\Entities;

class EquipmentPrice
{
    public int $id;
    public string $nome;
    public ?string $equipamentoPattern;
    public ?string $locaisEspeciais;
    public ?string $mercado;
    public float $valor;
    public bool $ativo;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = (int) $data['id'];
        $this->nome = $data['nome'] ?? '';
        $this->equipamentoPattern = $data['equipamento_pattern'] ?? null;
        $this->locaisEspeciais = $data['locais_especiais'] ?? null;
        $this->mercado = $data['mercado'] ?? null;
        $this->valor = (float) ($data['valor'] ?? 0);
        $this->ativo = (bool) ($data['ativo'] ?? 1);
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'equipamento_pattern' => $this->equipamentoPattern,
            'locais_especiais' => $this->locaisEspeciais,
            'mercado' => $this->mercado,
            'valor' => $this->valor,
            'ativo' => $this->ativo,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
