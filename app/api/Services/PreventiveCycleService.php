<?php

namespace App\Api\Services;

use App\Api\Repositories\PreventiveCycleRepository;

class PreventiveCycleService
{
    private PreventiveCycleRepository $repository;

    public function __construct()
    {
        $this->repository = new PreventiveCycleRepository();
    }

    public function listAll(string $ciclo, int $limit = 20, int $offset = 0, string $search = ''): array
    {
        $items = $this->repository->listByCiclo($ciclo, $limit, $offset, $search);
        $total = $this->repository->count($ciclo, $search);
        return ['items' => $items, 'total' => $total];
    }

    public function save(string $ciclo, array $items): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        return $this->repository->saveBatch($ciclo, $items);
    }

    public function summary(string $ciclo): array
    {
        return $this->repository->summary($ciclo);
    }
}
