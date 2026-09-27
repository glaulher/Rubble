<?php

namespace App\Api\Services;

use App\Api\Repositories\PreventiveCycleRepository;

class PreventiveCycleService
{
    private PreventiveCycleRepository $repository;
    private EquipmentPriceService $priceService;

    private const EXCLUDED_EQUIPMENT = 'N/A';
    private const EXCLUDED_LOCATION = 'Fornecimento';

    public const SCM_LANCADOS_STATUSES = ['SCM aprovado', 'SCM verificado', 'SCM enviado'];

    private const SCM_STATUS_ORDER = ['SCM em aberto', 'SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado'];

    public function __construct(?PreventiveCycleRepository $repository = null, ?EquipmentPriceService $priceService = null)
    {
        $this->repository = $repository ?? new PreventiveCycleRepository();
        $this->priceService = $priceService ?? new EquipmentPriceService();
    }

    public function listAll(string $ciclo, int $limit = 20, int $offset = 0, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, array $scmStatuses = []): array
    {
        if ($scmLancados && empty($scmStatuses)) {
            $scmStatuses = self::SCM_LANCADOS_STATUSES;
        }
        $valorCaseSql = $this->priceService->getValorCaseSql();
        $items = $this->repository->listByCiclo($ciclo, $limit, $offset, $search, $checkedOnly, $hasObservacao, $noScm, $scmLancados, $valorCaseSql, self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, $scmStatuses);
        $total = $this->repository->count($ciclo, $search, $checkedOnly, $hasObservacao, $noScm, $scmLancados, self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, $scmStatuses);
        return ['items' => $items, 'total' => $total];
    }

    public function save(string $ciclo, array $items): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        return $this->repository->saveBatch($ciclo, $items);
    }

    public function summary(string $ciclo, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, array $scmStatuses = []): array
    {
        if ($scmLancados && empty($scmStatuses)) {
            $scmStatuses = self::SCM_LANCADOS_STATUSES;
        }
        $valorCaseSql = $this->priceService->getValorCaseSql();
        return $this->repository->summary($ciclo, $hasObservacao, $noScm, $scmLancados, $valorCaseSql, self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, $scmStatuses);
    }

    public function listIds(string $ciclo, string $search = '', bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, array $scmStatuses = []): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        if ($scmLancados && empty($scmStatuses)) {
            $scmStatuses = self::SCM_LANCADOS_STATUSES;
        }
        return $this->repository->listIdsByCiclo($ciclo, $search, $hasObservacao, $noScm, $scmLancados, self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, $scmStatuses);
    }

    public function validateScm(string $scmNumber, int $equipamentoId = 0): array
    {
        $scm = $this->repository->findScmWithEquipment($scmNumber, $equipamentoId);
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
        return $this->repository->scmStatusCount($ciclo, self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, self::SCM_STATUS_ORDER);
    }

    public function autoLinkScms(string $ciclo, bool $force = false): array
    {
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $ciclo)) {
            throw new \InvalidArgumentException('Formato de ciclo inválido (use YYYY-MM)');
        }
        $linked = $this->repository->autoLinkScms($ciclo, $force);
        return [
            'ciclo' => $ciclo,
            'linked' => $linked,
        ];
    }
}

