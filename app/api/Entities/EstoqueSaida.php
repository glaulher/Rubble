<?php

namespace App\Api\Entities;

class EstoqueSaida
{
    public int $id;
    public int $estoqueMaterialId;
    public float $quantidadeSaida;
    public string $dataSaida;
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

    // Atributos do item pai (estoque_materiais)
    public ?string $materialDescricao;
    public ?string $unidade;
    public ?float $precoCompra;
    public ?string $dataEntrada;
    public ?string $fornecedorNf;

    // Atributos de joins (equipamentos e pv_item)
    public ?string $equipamento;
    public ?string $capacidade;
    public ?string $local;
    public ?string $localidade;
    public ?string $pvItemDescricao;

    public function __construct(array $data)
    {
        $this->id = (int) ($data['id'] ?? 0);
        $this->estoqueMaterialId = (int) ($data['estoque_material_id'] ?? 0);
        $this->quantidadeSaida = (float) ($data['quantidade_saida'] ?? 1.00);
        $this->dataSaida = (string) ($data['data_saida'] ?? '');
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

        $this->materialDescricao = self::toString($data['material_descricao'] ?? null);
        $this->unidade = (string) ($data['unidade'] ?? 'UN');
        $this->precoCompra = self::toFloat($data['preco_compra'] ?? null);
        $this->dataEntrada = self::toString($data['data_entrada'] ?? null);
        $this->fornecedorNf = self::toString($data['fornecedor_nf'] ?? null);

        $this->equipamento = self::toString($data['equipamento'] ?? null);
        $this->capacidade = self::toString($data['capacidade'] ?? null);
        $this->local = self::toString($data['local'] ?? null);
        $this->localidade = self::toString($data['localidade'] ?? null);
        $this->pvItemDescricao = self::toString($data['pv_item_descricao'] ?? null);
    }

    public function toArray(): array
    {
        $precoCompra = $this->precoCompra ?? 0.00;
        $totalCompra = round($this->quantidadeSaida * $precoCompra, 2);
        $totalVenda = $this->precoVenda !== null ? round($this->quantidadeSaida * $this->precoVenda, 2) : null;
        $lucroBruto = $totalVenda !== null ? round($totalVenda - $totalCompra, 2) : null;

        $margemPercent = null;
        if ($this->precoVenda !== null && $this->precoVenda > 0) {
            $margemPercent = round((($this->precoVenda - $precoCompra) / $this->precoVenda) * 100, 2);
        }

        $markupPercent = null;
        if ($precoCompra > 0 && $this->precoVenda !== null) {
            $markupPercent = round((($this->precoVenda - $precoCompra) / $precoCompra) * 100, 2);
        }

        return [
            'id' => $this->id,
            'estoque_material_id' => $this->estoqueMaterialId,
            'material_descricao' => $this->materialDescricao,
            'unidade' => $this->unidade,
            'quantidade_saida' => $this->quantidadeSaida,
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
            'preco_compra' => $precoCompra,
            'total_compra' => $totalCompra,
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
