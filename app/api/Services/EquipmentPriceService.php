<?php

namespace App\Api\Services;

use App\Api\Repositories\EquipmentPriceRepository;
use App\Api\Entities\EquipmentPrice;

class EquipmentPriceService
{
    private EquipmentPriceRepository $repository;

    public function __construct(?EquipmentPriceRepository $repository = null)
    {
        $this->repository = $repository ?? new EquipmentPriceRepository();
    }

    public function listAll(): array
    {
        $items = $this->repository->listAll();
        return array_map(fn(EquipmentPrice $item) => $item->toArray(), $items);
    }

    public function getById(int $id): ?array
    {
        $item = $this->repository->getById($id);
        return $item ? $item->toArray() : null;
    }

    public function save(array $data): int
    {
        $this->validate($data);
        return $this->repository->save($data);
    }

    public function update(int $id, array $data): bool
    {
        $this->validate($data);
        return $this->repository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function resolvePrice(string $equipamento, ?string $local, ?float $capacidade): float
    {
        return $this->repository->resolvePrice($equipamento, $local, $capacidade);
    }

    private function validate(array $data): void
    {
        if (empty($data['nome'])) {
            throw new \InvalidArgumentException('Nome é obrigatório');
        }

        if (!isset($data['valor']) || $data['valor'] < 0) {
            throw new \InvalidArgumentException('Valor deve ser maior ou igual a zero');
        }
    }
}
