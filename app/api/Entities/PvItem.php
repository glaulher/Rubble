<?php

namespace App\Api\Entities;

class PvItem
{
    public int $id;
    public int $pvId;
    public ?string $lpuOrigin;
    public ?string $lpuDescription;
    public ?string $description;
    public ?int $itemNumber;
    public ?float $quantity;
    public ?float $value;
    public ?float $totalValue;
    public ?float $bdi;
    public ?float $flpuValue;
    public ?string $invoice;
    public ?string $scm;
    public ?string $report;
    public ?string $filterData;

    public function __construct(array $data)
    {
        $this->id = (int) ($data['id'] ?? 0);
        $this->pvId = (int) ($data['pv_id'] ?? 0);
        $this->lpuOrigin = $data['lpu_origem'] ?? null;
        $this->lpuDescription = $data['descricao_lpu'] ?? null;
        $this->description = $data['descricao'] ?? null;
        $this->itemNumber = isset($data['numero_item']) ? (int) $data['numero_item'] : null;
        $this->quantity = isset($data['quantidade']) ? (float) $data['quantidade'] : null;
        $this->value = isset($data['valor']) ? (float) $data['valor'] : null;
        $this->totalValue = isset($data['valor_total']) ? (float) $data['valor_total'] : null;
        $this->bdi = isset($data['bdi']) ? (float) $data['bdi'] : null;
        $this->flpuValue = isset($data['valor_flpu']) ? (float) $data['valor_flpu'] : null;
        $this->invoice = $data['fatura'] ?? null;
        $this->scm = $data['scm'] ?? null;
        $this->report = $data['laudo'] ?? null;
        $this->filterData = $data['filtro_data'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'pv_id' => $this->pvId,
            'lpu_origem' => $this->lpuOrigin,
            'descricao_lpu' => $this->lpuDescription,
            'descricao' => $this->description,
            'numero_item' => $this->itemNumber,
            'quantidade' => $this->quantity,
            'valor' => $this->value,
            'valor_total' => $this->totalValue,
            'bdi' => $this->bdi,
            'valor_flpu' => $this->flpuValue,
            'fatura' => $this->invoice,
            'scm' => $this->scm,
            'laudo' => $this->report,
            'filtro_data' => $this->filterData,
        ];
    }
}
