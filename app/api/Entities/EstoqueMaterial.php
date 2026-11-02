<?php

namespace App\Api\Entities;

class EstoqueMaterial
{
    public int $id;
    public string $status;
    public string $materialDescricao;
    public float $quantidade;
    public string $unidade;
    public float $precoCompra;
    public string $dataEntrada;
    public ?string $fornecedorNf;
    public string $site;
    public ?string $observacoes;
    public ?string $createdAt;
    public ?string $updatedAt;

    // Campos calculados agregados das saídas
    public float $quantidadeBaixada;
    public float $quantidadeDisponivel;
    public int $totalSaidas;

    public function __construct(array $data)
    {
        $this->id = (int) ($data['id'] ?? 0);
        $this->status = (string) ($data['status'] ?? 'em_estoque');
        $this->materialDescricao = (string) ($data['material_descricao'] ?? '');
        $this->quantidade = (float) ($data['quantidade'] ?? 1.00);
        $this->unidade = (string) ($data['unidade'] ?? 'UN');
        $this->precoCompra = (float) ($data['preco_compra'] ?? 0.00);
        $this->dataEntrada = (string) ($data['data_entrada'] ?? '');
        $this->fornecedorNf = self::toString($data['fornecedor_nf'] ?? null);
        $this->site = (string) ($data['site'] ?? 'Estoque Central');
        $this->observacoes = self::toString($data['observacoes'] ?? null);
        $this->createdAt = self::toString($data['created_at'] ?? null);
        $this->updatedAt = self::toString($data['updated_at'] ?? null);

        $this->quantidadeBaixada = (float) ($data['quantidade_baixada'] ?? 0.00);
        $this->quantidadeDisponivel = isset($data['quantidade_disponivel'])
            ? (float) $data['quantidade_disponivel']
            : max(0.00, round($this->quantidade - $this->quantidadeBaixada, 2));
        $this->totalSaidas = (int) ($data['total_saidas'] ?? 0);
    }

    public function toArray(): array
    {
        $totalCompra = round($this->quantidade * $this->precoCompra, 2);

        return [
            'id' => $this->id,
            'status' => $this->status,
            'material_descricao' => $this->materialDescricao,
            'quantidade' => $this->quantidade,
            'quantidade_baixada' => $this->quantidadeBaixada,
            'quantidade_disponivel' => $this->quantidadeDisponivel,
            'total_saidas' => $this->totalSaidas,
            'unidade' => $this->unidade,
            'preco_compra' => $this->precoCompra,
            'total_compra' => $totalCompra,
            'data_entrada' => $this->dataEntrada,
            'fornecedor_nf' => $this->fornecedorNf,
            'site' => $this->site,
            'observacoes' => $this->observacoes,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }

    private static function toString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }

    private static function toInt(mixed $value): ?int
    {
        $string = self::toString($value);

        return $string === null ? null : (int) $string;
    }

    private static function toFloat(mixed $value): ?float
    {
        $string = self::toString($value);

        return $string === null ? null : (float) $string;
    }
}
