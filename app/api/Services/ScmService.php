<?php

namespace App\Api\Services;

use App\Api\Repositories\ScmRepository;

class ScmService
{
    public const DEFAULT_EXCLUDED_STATUSES = ['SCM em aberto'];

    private const STATUS_MAP = [
        'GERADO'    => 'SCM aprovado',
        'NEGADO'    => 'SCM negado',
        'CONFERIDO' => 'SCM verificado',
        'VALIDADO'  => 'SCM verificado',
        'EXECUTADO' => 'SCM enviado',
        'ABERTO'    => 'SCM em aberto',
        'EM ABERTO' => 'SCM em aberto',
    ];

    private ScmRepository $repository;
    private PreventiveCycleService $preventiveCycleService;

    private const PV_SYNC_STATUSES = ['SCM aprovado', 'SCM negado', 'SCM enviado'];

    public function __construct(?ScmRepository $repository = null, ?PreventiveCycleService $preventiveCycleService = null)
    {
        $this->repository = $repository ?? new ScmRepository();
        $this->preventiveCycleService = $preventiveCycleService ?? new PreventiveCycleService();
    }

    public function listAll(int $limit, int $offset, string $search = '', ?string $dateFrom = null, ?string $dateTo = null, array $segments = [], ?string $status = null, array $sites = [], ?string $ciclo = null): array
    {
        $excludeStatuses = ($status === null || $status === '') ? self::DEFAULT_EXCLUDED_STATUSES : [];
        $items = $this->repository->listAll($limit, $offset, $search, $dateFrom, $dateTo, $segments, $status, $sites, $ciclo, $excludeStatuses);
        return [
            'items'       => $items,
            'total'       => $this->repository->count($search, $dateFrom, $dateTo, $segments, $status, $sites, $ciclo, $excludeStatuses),
            'total_valor' => $this->repository->getTotalValue($search, $dateFrom, $dateTo, $segments, $status, $sites, $ciclo, $excludeStatuses),
        ];
    }

    public function segments(): array
    {
        return $this->repository->segments();
    }

    public function sites(): array
    {
        return $this->repository->sites();
    }

    public function cycles(): array
    {
        return $this->repository->cycles();
    }

    public function getById(int $id): ?array
    {
        return $this->repository->getById($id);
    }

    public function importBatch(array $rows): array
    {
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $grouped = $this->groupByScm($rows);
        $affectedCycles = [];

        foreach ($grouped as $scmCode => $group) {
            try {
                $first = $group['first'];
                $items = $group['items'];

                $itemRows = [];
                $itemStatuses = [];
                foreach ($items as $row) {
                    $rowStatusUpper = mb_strtoupper(trim($row['STATUS'] ?? ''));
                    if (str_contains($rowStatusUpper, 'ABERTO')) {
                        $rowMappedStatus = 'SCM em aberto';
                    } else {
                        $rowMappedStatus = self::STATUS_MAP[$rowStatusUpper] ?? ($row['STATUS'] ?? '');
                    }
                    if ($rowMappedStatus !== '') {
                        $itemStatuses[] = $rowMappedStatus;
                    }
                    $itemRows[] = [
                        'servico'           => trim($row['SERVIÇO'] ?? ''),
                        'unidade'           => trim($row['UNIDADE'] ?? ''),
                        'valor'             => $this->parseValue($row['VALOR'] ?? 0),
                        'qtde_execucao'     => $this->parseValue($row['QTDE_EXECUÇÃO'] ?? 0),
                        'subtotal_execucao' => $this->parseValue($row['SUBTOTAL_EXECUÇÃO'] ?? 0),
                        'status'            => $rowMappedStatus,
                    ];
                }

                $firstStatusUpper = mb_strtoupper(trim($first['STATUS'] ?? ''));
                $defaultStatus = str_contains($firstStatusUpper, 'ABERTO')
                    ? 'SCM em aberto'
                    : (self::STATUS_MAP[$firstStatusUpper] ?? ($first['STATUS'] ?? ''));
                $mappedStatus = $this->resolveParentStatus($itemStatuses, $defaultStatus);

                $site = trim($first['SITE'] ?? '');
                $equipamentoId = $this->resolveEquipmentId($site);

                $parentData = [
                    'scm'              => trim($scmCode),
                    'data'             => $this->parseDate($first['DATA'] ?? null),
                    'atividade'        => trim($first['ATIVIDADE'] ?? ''),
                    'site'             => $site,
                    'cidade'           => trim($first['CIDADE'] ?? ''),
                    'abertura'         => trim($first['ABERTURA'] ?? ''),
                    'data_execucao'    => $this->parseDate($first['DATA_EXECUÇÃO'] ?? null),
                    'data_validacao'   => $this->parseDate($first['DATA_VALIDAÇÃO'] ?? null),
                    'medicao'          => trim($first['MEDIÇÃO'] ?? ''),
                    'origem'           => trim($first['ORIGEM'] ?? ''),
                    'segmento'         => trim($first['SEGMENTO'] ?? ''),
                    'obs'              => trim($first['OBS'] ?? ''),
                    'equipamento_id'   => $equipamentoId,
                ];

                if (empty($parentData['scm'])) {
                    $skipped += count($items);
                    continue;
                }

                $existing = $this->repository->findByScmCode($parentData['scm']);
                $this->repository->upsert($parentData);

                $scmRecord = $this->repository->findByScmCode($parentData['scm']);
                $scmId = $scmRecord['id'];

                $this->repository->upsertItems($scmId, $itemRows);

                if (in_array($mappedStatus, self::PV_SYNC_STATUSES, true)) {
                    $this->repository->updatePvItemStatusByScm($parentData['scm'], $mappedStatus);
                }

                $isPreventiva = str_contains(mb_strtoupper($parentData['segmento']), 'PREVENTIVA')
                    || str_contains(mb_strtoupper($parentData['origem']), 'PREVENTIVA')
                    || str_contains(mb_strtoupper($parentData['atividade']), 'PREVENTIVA')
                    || str_contains(mb_strtoupper($parentData['atividade']), 'CHILLER');

                if ($isPreventiva) {
                    $cycle = $this->determineCycle($parentData);
                    if ($cycle !== null) {
                        $affectedCycles[$cycle] = true;
                    }
                }

                if ($existing) {
                    $updated++;
                } else {
                    $imported++;
                }
            } catch (\Throwable $e) {
                $errors[] = "SCM {$scmCode}: " . $e->getMessage();
            }
        }

        $autoLinkedTotal = 0;
        foreach (array_keys($affectedCycles) as $cycle) {
            try {
                $res = $this->preventiveCycleService->autoLinkScms($cycle);
                $autoLinkedTotal += $res['linked'] ?? 0;
            } catch (\Throwable $e) {
                // Non-blocking for SCM import
            }
        }

        return [
            'imported'    => $imported,
            'updated'     => $updated,
            'skipped'     => $skipped,
            'errors'      => $errors,
            'auto_linked' => $autoLinkedTotal,
        ];
    }

    public function determineCycle(array $data): ?string
    {
        $dateStr = $data['data_validacao'] ?? $data['data_execucao'] ?? $data['data'] ?? null;
        if (!empty($dateStr) && preg_match('/^(\d{4}-\d{2})/', $dateStr, $m)) {
            return $m[1];
        }
        return null;
    }

    public function resolveParentStatus(array $itemStatuses, string $defaultStatus): string
    {
        if (empty($itemStatuses)) {
            return $defaultStatus;
        }
        $priorityOrder = ['SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'];
        foreach ($priorityOrder as $pStatus) {
            if (in_array($pStatus, $itemStatuses, true)) {
                return $pStatus;
            }
        }
        return $itemStatuses[0] ?? $defaultStatus;
    }

    private function groupByScm(array $rows): array
    {
        $grouped = [];
        foreach ($rows as $row) {
            $scmCode = trim($row['SCM'] ?? '');
            if (empty($scmCode)) continue;

            if (!isset($grouped[$scmCode])) {
                $grouped[$scmCode] = [
                    'first' => $row,
                    'items' => [],
                ];
            }
            $grouped[$scmCode]['items'][] = $row;
        }
        return $grouped;
    }

    public function resolveEquipmentId(string $site): ?int
    {
        $eq = $this->repository->findEquipmentByLocalScm($site);
        if ($eq !== null) {
            return (int) $eq['id'];
        }
        $eq = $this->repository->findEquipmentByEnderecoLike($site);
        if ($eq !== null) {
            return (int) $eq['id'];
        }
        return null;
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    private const DATE_FORMATS = [
        'd/m/Y H:i:s',
        'd/m/Y H:i',
        'd/m/Y',
        'Y-m-d H:i:s',
        'Y-m-d H:i',
        'Y-m-d',
        'Y-m-d\TH:i:s',
    ];

    private function parseDate(?string $dateStr): ?string
    {
        if (empty($dateStr)) return null;
        $dateStr = trim($dateStr);
        foreach (self::DATE_FORMATS as $format) {
            $parsed = \DateTime::createFromFormat($format, $dateStr);
            if ($parsed !== false) {
                return $parsed->format('Y-m-d');
            }
        }
        return null;
    }

    private function parseValue($value): float
    {
        if (is_numeric($value)) return (float) $value;
        $cleaned = preg_replace('/[R$\s]/', '', trim($value));
        $cleaned = str_replace(['.', ','], ['', '.'], $cleaned);
        return is_numeric($cleaned) ? (float) $cleaned : 0.0;
    }
}
