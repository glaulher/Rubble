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
    public ?string $dataSaida;
    public ?string $tecnicoNome;
    public ?string $numeroOs;
    public string $site;
    public ?int $equipamentoId;
    public ?string $equipamentoTexto;
    public ?string $numeroPv;
    public ?int $pvItemId;
    public ?float $precoVenda;
    public ?string $observacoes;
    public ?string $createdAt;
    public ?string $updatedAt;

    // Joined attributes
    public ?string $equipamento;
    public ?string $capacidade;
    public ?string $local;
    public ?string $localidade;
    public ?string $pvItemDescricao;

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
        $this->dataSaida = self::toString($data['data_saida'] ?? null);
        $this->tecnicoNome = self::toString($data['tecnico_nome'] ?? null);
        $this->numeroOs = self::toString($data['numero_os'] ?? null);
        $this->site = (string) ($data['site'] ?? '');
        $this->equipamentoId = self::toInt($data['equipamento_id'] ?? null);
        $this->equipamentoTexto = self::toString($data['equipamento_texto'] ?? null);
        $this->numeroPv = self::toString($data['numero_pv'] ?? null);
        $this->pvItemId = self::toInt($data['pv_item_id'] ?? null);
        $this->precoVenda = self::toFloat($data['preco_venda'] ?? null);
        $this->observacoes = self::toString($data['observacoes'] ?? null);
        $this->createdAt = self::toString($data['created_at'] ?? null);
        $this->updatedAt = self::toString($data['updated_at'] ?? null);

        $this->equipamento = self::toString($data['equipamento'] ?? null);
        $this->capacidade = self::toString($data['capacidade'] ?? null);
        $this->local = self::toString($data['local'] ?? null);
        $this->localidade = self::toString($data['localidade'] ?? null);
        $this->pvItemDescricao = self::toString($data['pv_item_descricao'] ?? null);
    }

    public function toArray(): array
    {
        $totalCompra = round($this->quantidade * $this->precoCompra, 2);
        $totalVenda = $this->precoVenda !== null ? round($this->quantidade * $this->precoVenda, 2) : null;
        $lucroBruto = $totalVenda !== null ? round($totalVenda - $totalCompra, 2) : null;

        $margemPercent = null;
        if ($this->precoVenda !== null && $this->precoVenda > 0) {
            $margemPercent = round((($this->precoVenda - $this->precoCompra) / $this->precoVenda) * 100, 2);
        }

        $markupPercent = null;
        if ($this->precoCompra > 0 && $this->precoVenda !== null) {
            $markupPercent = round((($this->precoVenda - $this->precoCompra) / $this->precoCompra) * 100, 2);
        }

        return [
            'id' => $this->id,
            'status' => $this->status,
            'material_descricao' => $this->materialDescricao,
            'quantidade' => $this->quantidade,
            'unidade' => $this->unidade,
            'preco_compra' => $this->precoCompra,
            'total_compra' => $totalCompra,
            'data_entrada' => $this->dataEntrada,
            'fornecedor_nf' => $this->fornecedorNf,
            'data_saida' => $this->dataSaida,
            'tecnico_nome' => $this->tecnicoNome,
            'numero_os' => $this->numeroOs,
            'site' => $this->site,
            'equipamento_id' => $this->equipamentoId,
            'equipamento_texto' => $this->equipamentoTexto,
            'equipamento' => $this->equipamento,
            'capacidade' => $this->capacidade,
            'local' => $this->local,
            'localidade' => $this->localidade,
            'numero_pv' => $this->numeroPv,
            'pv_item_id' => $this->pvItemId,
            'pv_item_descricao' => $this->pvItemDescricao,
            'preco_venda' => $this->precoVenda,
            'total_venda' => $totalVenda,
            'lucro_bruto' => $lucroBruto,
            'margem_percent' => $margemPercent,
            'markup_percent' => $markupPercent,
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
