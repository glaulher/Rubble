<?php

namespace App\Api\Entities;

class Pv
{
    public int $id;
    public string $numberPv;
    public ?string $date;
    public ?string $cycle;
    public string $location;
    public string $status;
    public ?string $ral;
    public ?string $uf;
    public int $equipmentId;
    public ?string $equipment;
    public ?float $capacity;
    public ?string $locality;
    public ?string $localDoEndereco = null;

    public ?string $createdAt;
    public ?string $updatedAt;
    public array $items = [];
    public array $tickets = [];
    public ?string $computedOs = null;
    public ?float $totalValue = null;
    public ?int $itemsCount = null;

    public function __construct(array $data)
    {
        $this->id = (int) $data['id'];
        $this->numberPv = $data['numero_pv'];
        $this->date = $data['data'] ?? null;
        $this->cycle = $data['ciclo'] ?? null;
        $this->location = $data['local'];
        $this->status = $data['status'];
        $this->ral = $data['ral'] ?? null;
        $this->uf = $data['uf'] ?? null;
        $this->equipmentId = (int) $data['equipamento_id'];
        $this->equipment = $data['equipamento'] ?? null;
        $this->capacity = isset($data['capacidade']) ? (float) $data['capacidade'] : null;
        $this->locality = $data['localidade'] ?? null;
        $this->localDoEndereco = $data['local_do_endereco'] ?? null;
        $this->computedOs = $data['os'] ?? null;

        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
        $this->totalValue = isset($data['valor_total']) ? (float) $data['valor_total'] : null;
        $this->itemsCount = isset($data['itens_count']) ? (int) $data['itens_count'] : null;
    }

    public function toArray(): array
    {
        $osStr = $this->computedOs ?? '';
        if ($this->tickets !== []) {
            $osNumbers = array_map(fn(array $r) => $r['os'], $this->tickets);
            $osStr = implode(', ', $osNumbers);
        }

        $arr = [
            'id' => $this->id,
            'numero_pv' => $this->numberPv,
            'data' => $this->date,
            'ciclo' => $this->cycle,
            'local' => $this->location,
            'status' => $this->status,
            'os' => $osStr,
            'ral' => $this->ral,
            'uf' => $this->uf,
            'equipamento_id' => $this->equipmentId,
            'equipamento' => $this->equipment,
            'capacidade' => $this->capacity,
            'localidade' => $this->locality,
            'local_do_endereco' => $this->localDoEndereco,
            'tickets' => $this->tickets,

            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];

        if ($this->items !== []) {
            $arr['itens'] = array_map(fn(PvItem $i) => $i->toArray(), $this->items);
        }

        if ($this->totalValue !== null) {
            $arr['valor_total'] = $this->totalValue;
        }

        if ($this->itemsCount !== null) {
            $arr['itens_count'] = $this->itemsCount;
        }

        return $arr;
    }

    public static function fromRow(array $row, array $itens = []): self
    {
        $pv = new self($row);
        $pv->items = $itens;
        return $pv;
    }
}
