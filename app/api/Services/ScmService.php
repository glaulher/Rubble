<?php

namespace App\Api\Services;

use App\Api\Repositories\ScmRepository;

class ScmService
{
    private ScmRepository $repository;

    private const STATUS_MAP = [
        'GERADO'    => 'SCM Aprovado',
        'NEGADO'    => 'SCM Negado',
        'CONFERIDO' => 'SCM Verificado',
        'VALIDADO'  => 'SCM Verificado',
        'EXECUTADO' => 'SCM Enviado',
    ];

    public function __construct()
    {
        $this->repository = new ScmRepository();
    }

    public function listAll(int $limit, int $offset, string $search = '', ?string $dateFrom = null, ?string $dateTo = null, ?string $segmento = null): array
    {
        $items = $this->repository->listAll($limit, $offset, $search, $dateFrom, $dateTo, $segmento);
        return [
            'items'       => $items,
            'total'       => $this->repository->count($search, $dateFrom, $dateTo, $segmento),
            'total_valor' => $this->repository->getTotalValue($search, $dateFrom, $dateTo, $segmento),
        ];
    }

    public function segments(): array
    {
        return $this->repository->segments();
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

        foreach ($grouped as $scmCode => $group) {
            try {
                $first = $group['first'];
                $items = $group['items'];

                $statusUpper = mb_strtoupper(trim($first['STATUS'] ?? ''));
                if ($statusUpper === 'EM ABERTO') {
                    $skipped += count($items);
                    continue;
                }

                $mappedStatus = self::STATUS_MAP[$statusUpper] ?? ($first['STATUS'] ?? '');

                $site = trim($first['SITE'] ?? '');
                $equipamentoId = $this->repository->resolveEquipmentId($site);

                $parentData = [
                    'scm'              => trim($scmCode),
                    'data'             => $this->parseDate($first['DATA'] ?? null),
                    'atividade'        => trim($first['ATIVIDADE'] ?? ''),
                    'site'             => $site,
                    'cidade'           => trim($first['CIDADE'] ?? ''),
                    'abertura'         => trim($first['ABERTURA'] ?? ''),
                    'status'           => $mappedStatus,
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

                $itemRows = [];
                foreach ($items as $row) {
                    $itemRows[] = [
                        'servico'           => trim($row['SERVIÇO'] ?? ''),
                        'unidade'           => trim($row['UNIDADE'] ?? ''),
                        'valor'             => $this->parseValue($row['VALOR'] ?? 0),
                        'qtde_execucao'     => $this->parseValue($row['QTDE_EXECUÇÃO'] ?? 0),
                        'subtotal_execucao' => $this->parseValue($row['SUBTOTAL_EXECUÇÃO'] ?? 0),
                    ];
                }

                $this->repository->upsertItems($scmId, $itemRows);

                if ($existing) {
                    $updated++;
                } else {
                    $imported++;
                }
            } catch (\Throwable $e) {
                $errors[] = "SCM {$scmCode}: " . $e->getMessage();
            }
        }

        return [
            'imported' => $imported,
            'updated'  => $updated,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ];
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

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    private function parseDate(?string $dateStr): ?string
    {
        if (empty($dateStr)) return null;
        $dateStr = trim($dateStr);
        $parsed = \DateTime::createFromFormat('d/m/Y H:i', $dateStr);
        if ($parsed) return $parsed->format('Y-m-d');
        $parsed = \DateTime::createFromFormat('d/m/Y', $dateStr);
        if ($parsed) return $parsed->format('Y-m-d');
        $parsed = \DateTime::createFromFormat('Y-m-d', $dateStr);
        if ($parsed) return $parsed->format('Y-m-d');
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
