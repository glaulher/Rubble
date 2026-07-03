<?php

namespace App\Api\Services;

use App\Api\Repositories\PvRepository;
use App\Api\Entities\Pv;

class PvService
{
    private const YEAR_START_OFFSETS = [
        '26' => 145, // 2026: skip 001-144 (pre-existing PVs before system deployment)
    ];

    private const UNIT_MIN_ONE = [
        'CONJUNTO', 'CV', 'DIARIA', 'HH', 'HORA', 'KIT', 'LOCAÇÃO MENSAL',
        'MENSAL', 'PAR', 'PÇ', 'PEÇA', 'PONTO', 'PROJETO', 'SACO', 'SERV.',
        'TR', 'UN.', 'UNIDADE', 'UNIT.',
    ];

    public const LPU_TABLES = [
        'civil_lpu', 'material_clima_lpu', 'material_chiller_lpu',
        'servico_clima_lpu', 'servico_chiller_lpu',
    ];

    public const LPU_ORIGIN_MAP = [
        'lpu_material_clima'   => 'material_clima_lpu',
        'lpu_material_chiller' => 'material_chiller_lpu',
        'lpu_civil'            => 'civil_lpu',
        'lpu_servico_clima'    => 'servico_clima_lpu',
        'lpu_servico_chiller'  => 'servico_chiller_lpu',
    ];

    private const STATUS_PRIORITY = [
        'SCM negado' => 1,
        'Aguardando envio' => 2,
        'Aprovado serv.' => 3,
        'E-mail de lib. aquisição/serviço' => 4,
        'Aprovado aquisição/serviço' => 5,
        'E-mail de aprov. serv. realizado' => 6,
        'SCM enviado' => 7,
        'SCM aprovado' => 8,
        'Cancelado' => 9,
    ];

    private const DEFAULT_ITEM_STATUS = 'Aguardando envio';

    private PvRepository $repository;
    private TicketService $ticketService;

    public function __construct(?PvRepository $repository = null, ?TicketService $ticketService = null)
    {
        $this->repository = $repository ?? new PvRepository();
        $this->ticketService = $ticketService ?? new TicketService();
    }

    public function listAll(int $limit = 20, int $offset = 0, string $search = '', ?string $status = null, ?string $cycle = null, string $sortBy = 'pv.id', string $sortDir = 'DESC'): array
    {
        $statusPrioritySql = $this->buildStatusPrioritySql();
        $items = $this->repository->listAll($limit, $offset, $search, $status, $cycle, $sortBy, $sortDir, $statusPrioritySql);
        return [
            'items' => array_map(fn (Pv $p) => $this->formatListRow($p), $items),
            'total' => $this->repository->count($search, $status, $cycle),
            'total_valor' => $this->repository->getTotalValue($search, $status, $cycle),
        ];
    }

    private function formatListRow(Pv $pv): array
    {
        return $pv->toArray();
    }

    public function getById(int $id): ?array
    {
        $pv = $this->repository->getById($id);
        return $pv?->toArray();
    }

    public function getByIds(array $ids): array
    {
        $pvs = $this->repository->getByIds($ids);
        return array_map(fn(Pv $p) => $p->toArray(), $pvs);
    }

    public function getListByIds(array $ids): array
    {
        return $this->repository->getListByIds($ids);
    }

    public function generateNumberPv(): string
    {
        $prefix = date('y');
        $max = $this->repository->getMaxNumberPv($prefix);

        $sequence = 0;

        if ($max !== null) {
            $seqStr = substr($max, 2);
            if (is_numeric($seqStr)) {
                $sequence = (int) $seqStr;
            }
        }

        $next = $sequence + 1;

        $offset = self::YEAR_START_OFFSETS[$prefix] ?? 0;
        if ($offset > 0 && $next < $offset) {
            $next = $offset;
        }

        return $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
    }

    public function getByNumberPv(string $numberPv): ?array
    {
        $pv = $this->repository->getByNumberPv($numberPv);
        return $pv?->toArray();
    }

    public function lookupLpuItem(string $lpuOrigin, int $itemNumber): ?array
    {
        $table = self::LPU_ORIGIN_MAP[$lpuOrigin] ?? null;

        if ($table === null) {
            return null;
        }

        return $this->repository->lookupLpuItem($table, $itemNumber, self::LPU_TABLES);
    }

    public function searchLpuItems(string $lpuOrigin, string $query): array
    {
        $table = self::LPU_ORIGIN_MAP[$lpuOrigin] ?? null;

        if ($table === null) {
            return [];
        }

        return $this->repository->searchLpuItems($table, $query, 20, self::LPU_TABLES);
    }

    public function getItemsForExport(array $pvIds): array
    {
        return $this->repository->getItemsByPvIds($pvIds);
    }

    public function calculateItemTotalValue(array $item): float
    {
        $quantity = (float) ($item['quantidade'] ?? 1);
        $fatura = $item['fatura'] ?? 'lpu';

        if ($fatura === 'flpu') {
            $flpuValue = (float) ($item['valor_flpu'] ?? 0);
            $bdi = (float) ($item['bdi'] ?? 0);
            return ($flpuValue * (1 + $bdi / 100)) * $quantity;
        }

        $value = (float) ($item['valor'] ?? 0);
        return $value * $quantity;
    }

    private function getFornecimentoId(): int
    {
        static $id = null;

        if ($id === null) {
            $id = $this->repository->getEquipmentIdByName('Fornecimento') ?? 0;
        }

        return $id;
    }

    public function save(array $data): int
    {
        $this->validateLpuItems($data['itens'] ?? []);

        if (!isset($data['numero_pv']) || empty($data['numero_pv'])) {
            $data['numero_pv'] = $this->generateNumberPv();
        }

        if (empty($data['equipamento_id'])) {
            $data['equipamento_id'] = $this->getFornecimentoId();
        }

        $this->repository->beginTransaction();
        try {
            $pvId = $this->repository->save($data);

            if (!empty($data['itens']) && is_array($data['itens'])) {
                foreach ($data['itens'] as $item) {
                    $item['pv_id'] = $pvId;
                    $item['status'] = $item['status'] ?? self::DEFAULT_ITEM_STATUS;
                    $item['valor_total'] = $this->calculateItemTotalValue($item);
                    $this->repository->saveItem($item);
                }
            }

            if (!empty($data['itens'])) {
                $worstStatus = $this->repository->getWorstStatus($pvId);
                $data['ticket_ids'] = $this->resolveOsToTicketIds(
                    $data['os'] ?? '',
                    $data['data'] ?? null,
                    isset($data['equipamento_id']) ? (int) $data['equipamento_id'] : null,
                    $worstStatus
                );
            }

            if (!empty($data['ticket_ids'])) {
                $this->repository->saveOsLinks($pvId, $data['ticket_ids']);
            }

            $this->repository->commit();
            return $pvId;
        } catch (\Throwable $e) {
            $this->repository->rollback();
            throw $e;
        }
    }

    public function update(array $data): bool
    {
        $this->validateLpuItems($data['itens'] ?? []);

        if (empty($data['equipamento_id'])) {
            $data['equipamento_id'] = $this->getFornecimentoId();
        }

        $this->repository->beginTransaction();
        try {
            $result = $this->repository->update($data);

            if (isset($data['itens']) && is_array($data['itens'])) {
                $this->repository->deleteItemsByPvId((int) $data['id']);

                foreach ($data['itens'] as $item) {
                    $item['pv_id'] = (int) $data['id'];
                    $item['status'] = $item['status'] ?? self::DEFAULT_ITEM_STATUS;
                    $item['valor_total'] = $this->calculateItemTotalValue($item);
                    $this->repository->saveItem($item);
                }
            }

            $worstStatus = $this->repository->getWorstStatus((int) $data['id']);
            $data['ticket_ids'] = $this->resolveOsToTicketIds(
                $data['os'] ?? '',
                $data['data'] ?? null,
                isset($data['equipamento_id']) ? (int) $data['equipamento_id'] : null,
                $worstStatus
            );

            $this->repository->deleteOsLinks((int) $data['id']);
            if (!empty($data['ticket_ids'])) {
                $this->repository->saveOsLinks((int) $data['id'], $data['ticket_ids']);
            }

            $this->repository->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->repository->rollback();
            throw $e;
        }
    }

    public function searchTicketsByOs(string $query): array
    {
        return $this->repository->searchTicketsByOs($query);
    }

    public function updateItemsByWorstStatus(int $pvId, string $status): bool
    {
        return $this->repository->updateItemsByWorstStatus($pvId, $status);
    }

    public function updateItemsByWorstStatusBatch(array $ids, string $status): bool
    {
        $allOk = true;
        foreach ($ids as $id) {
            if (!$this->repository->updateItemsByWorstStatus((int) $id, $status)) {
                $allOk = false;
            }
        }
        return $allOk;
    }

    public function listLocations(): array
    {
        return $this->repository->listLocations();
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function deleteItem(int $itemId): array
    {
        $pvId = $this->repository->getItemPvId($itemId);
        if ($pvId === null) {
            return ['success' => false, 'autoDeletedPv' => false];
        }

        $this->repository->deleteItem($itemId);
        $remaining = $this->repository->countItemsByPvId($pvId);

        if ($remaining === 0) {
            $this->repository->deleteOsLinks($pvId);
            $this->repository->delete($pvId);
            return [
                'success' => true,
                'autoDeletedPv' => true,
                'pvId' => $pvId,
                'remainingCount' => 0,
            ];
        }

        return [
            'success' => true,
            'autoDeletedPv' => false,
            'pvId' => $pvId,
            'remainingCount' => $remaining,
        ];
    }

    private function validateLpuItems(array $items): void
    {
        foreach ($items as $i => $item) {
            if (($item['fatura'] ?? '') !== 'lpu') {
                continue;
            }

            $lpuOrigin = $item['lpu_origem'] ?? '';
            $itemNumber = $item['numero_item'] ?? null;

            if (empty($lpuOrigin)) {
                throw new \RuntimeException("LPU Origem obrigat\u{00f3}ria para o item #" . ($i + 1));
            }

            if (empty($itemNumber) || (int) $itemNumber <= 0) {
                throw new \RuntimeException("N\u{00ba} Item obrigat\u{00f3}rio para o item #" . ($i + 1));
            }

            $found = $this->lookupLpuItem($lpuOrigin, (int) $itemNumber);

            if ($found === null) {
                throw new \RuntimeException(
                    "Item LPU n\u{00e3}o encontrado: {$lpuOrigin} / {$itemNumber}"
                );
            }

            $quantity = (float) ($item['quantidade'] ?? 0);
            $unidade = mb_strtoupper(trim($found['unidade'] ?? ''), 'UTF-8');

            if (in_array($unidade, self::UNIT_MIN_ONE, true) && $quantity != (int) $quantity) {
                throw new \RuntimeException(
                    "Quantidade deve ser n\u{00f3}mero inteiro para unidade '{$found['unidade']}' (item #" . ($i + 1) . ")"
                );
            }
        }
    }

    private function resolveOsToTicketIds(string $os, ?string $pvDate, ?int $equipamentoId = null, ?string $pvStatus = null): array
    {
        $osList = array_map('trim', explode(',', $os));
        $osList = array_filter($osList, fn($v) => $v !== '');
        if (empty($osList)) {
            return [];
        }

        $ticketIds = [];

        $registroStatus = 'Pendente';
        $registroObs = 'Necessario atualizar, salvamento automatico para lancamento de pv.';
        $dataConclusao = null;
        $pvStatusLower = $pvStatus ? mb_strtolower(trim($pvStatus), 'UTF-8') : '';
        if ($pvStatusLower === 'scm aprovado' || $pvStatusLower === 'scm enviado') {
            $registroStatus = "Conclu" . "\xc3\xad" . "do";
            $dataConclusao = date('Y-m-d');
        }

        foreach ($osList as $osNumber) {
            $found = $this->repository->lookupTicketByOsAndEquip($osNumber, $equipamentoId);

            if ($found) {
                $ticketIds[] = (int) $found['id'];
                continue;
            }

            $ticketData = [
                'equipamento_id' => $equipamentoId,
                'os' => $osNumber,
                'data' => $pvDate,
                'equipe' => 'A definir',
                'status' => $registroStatus,
                'data_concluido' => $dataConclusao,
                'material' => 'Sim',
                'obs' => $registroObs,
            ];

            $ticketIds[] = $this->ticketService->save($ticketData);
        }

        return $ticketIds;
    }

    private function buildStatusPrioritySql(): string
    {
        $parts = [];
        foreach (self::STATUS_PRIORITY as $status => $weight) {
            $parts[] = "WHEN '" . addslashes($status) . "' THEN {$weight}";
        }
        return 'CASE pv_item.status ' . implode(' ', $parts) . ' ELSE 99 END';
    }

    public function getDefaultItemStatus(): string
    {
        return self::DEFAULT_ITEM_STATUS;
    }
}
