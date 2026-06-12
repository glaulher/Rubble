<?php

namespace App\Api\Services;

use App\Api\Repositories\PreventiveCycleRepository;

class PreventiveCycleService
{
    private PreventiveCycleRepository $repository;

    public function __construct(?PreventiveCycleRepository $repository = null)
    {
        $this->repository = $repository ?? new PreventiveCycleRepository();
    }

    public function listAll(string $ciclo, int $limit = 20, int $offset = 0, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false): array
    {
        $items = $this->repository->listByCiclo($ciclo, $limit, $offset, $search, $checkedOnly, $hasObservacao, $noScm, $scmLancados);
        $total = $this->repository->count($ciclo, $search, $checkedOnly, $hasObservacao, $noScm, $scmLancados);
        return ['items' => $items, 'total' => $total];
    }

    public function save(string $ciclo, array $items): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        return $this->repository->saveBatch($ciclo, $items);
    }

    public function summary(string $ciclo, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false): array
    {
        return $this->repository->summary($ciclo, $hasObservacao, $noScm, $scmLancados);
    }

    public function listIds(string $ciclo, string $search = '', bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        return $this->repository->listIdsByCiclo($ciclo, $search, $hasObservacao, $noScm, $scmLancados);
    }

    public function validateScm(string $scmNumber): array
    {
        $scm = $this->repository->findScmWithEquipment($scmNumber);
        if (!$scm) {
            return ['found' => false];
        }
        return [
            'found' => true,
            'status' => $scm['status'] ?? null,
            'segmento' => $scm['segmento'] ?? null,
            'origem' => $scm['origem'] ?? null,
            'mercado_equipamento' => $scm['mercado'] ?? null,
        ];
    }

    public function scmStatusCount(string $ciclo): array
    {
        return $this->repository->scmStatusCount($ciclo);
    }
}
