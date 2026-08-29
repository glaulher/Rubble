<?php

namespace App\Api\Services;

use App\Api\Repositories\PreventivaDashboardRepository;

class PreventivaDashboardService
{
    private PreventivaDashboardRepository $repository;

    private const STATUS_COLORS = [
        'concluído' => '#10B981',
        'concluido' => '#10B981',
        'em andamento' => '#F59E0B',
        'planejado' => '#EF4444',
        'pendente' => '#EF4444',
        'projeto clean up' => '#EF4444',
    ];

    public function __construct(?PreventivaDashboardRepository $repository = null)
    {
        $this->repository = $repository ?? new PreventivaDashboardRepository();
    }

    public function getStats(?string $dateFrom, ?string $dateTo, ?string $status, string $search = ''): array
    {
        $rows = $this->repository->listForDashboard($dateFrom, $dateTo, $status, $search);

        // Desconsiderar cancelado (regra de negócio)
        $filtered = [];
        foreach ($rows as $r) {
            $s = mb_strtolower(trim($r['status'] ?? ''), 'UTF-8');
            if ($s === 'cancelado') {
                continue;
            }
            $filtered[] = $r;
        }
        $rows = $filtered;

        $total = count($rows);
        $completed = 0;
        $inProgress = 0;
        $pending = 0;
        $statusBreakdown = [];
        $siteMap = [];
        $allRows = [];

        foreach ($rows as $row) {
            $status = mb_strtolower(trim($row['status'] ?? ''), 'UTF-8');
            $site = trim($row['site'] ?? 'Sem site');
            if ($site === '') {
                $site = 'Sem site';
            }
            $machineCount = (int) ($row['machine_count'] ?? 0);
            $qtd = $row['qtd_executada'] !== null && $row['qtd_executada'] !== '' ? (int) $row['qtd_executada'] : 0;

            $isCompleted = ($status === 'concluído' || $status === 'concluido');
            $isInProgress = ($status === 'em andamento');

            if ($isCompleted) {
                $completed++;
            } elseif ($isInProgress) {
                $inProgress++;
            } else {
                $pending++;
            }

            $key = $status !== '' ? $status : 'desconhecido';
            $statusBreakdown[$key] = ($statusBreakdown[$key] ?? 0) + 1;

            if (!isset($siteMap[$site])) {
                $siteMap[$site] = ['site' => $site, 'total' => 0, 'completed' => 0, 'inProgress' => 0, 'pending' => 0, 'machine_count' => $machineCount, 'qtd_sum' => 0, 'status' => $status];
            }
            $siteMap[$site]['total']++;
            $siteMap[$site]['qtd_sum'] += $qtd;
            if ($isCompleted) {
                $siteMap[$site]['completed']++;
            } elseif ($isInProgress) {
                $siteMap[$site]['inProgress']++;
            } else {
                $siteMap[$site]['pending']++;
            }
            // manter machine_count mais recente
            $siteMap[$site]['machine_count'] = $machineCount;

            $allRows[] = $row;
        }

        $isFiltered = ($dateFrom !== null && $dateFrom !== '') || ($dateTo !== null && $dateTo !== '');

        // Treemap: um retângulo por site
        $treemap = [];
        foreach ($siteMap as $site => $info) {
            $value = $info['machine_count'] > 0 ? $info['machine_count'] : $info['total'];
            if ($value <= 0) {
                $value = 1;
            }

            if ($isFiltered) {
                // Com filtro de período:
                // Verde se 100% das máquinas do site foram preventivadas no período OU todas as atividades do período concluídas
                $isAllCompleted = false;
                if ($info['machine_count'] > 0 && $info['qtd_sum'] >= $info['machine_count']) {
                    $isAllCompleted = true;
                } elseif ($info['completed'] > 0 && $info['completed'] === $info['total']) {
                    $isAllCompleted = true;
                }

                $color = '#EF4444';
                if ($isAllCompleted) {
                    $color = '#10B981';
                } elseif ($info['inProgress'] > 0 || $info['completed'] > 0 || $info['qtd_sum'] > 0) {
                    $color = '#F59E0B';
                }
            } else {
                // Consolidado Geral (sem filtro de período):
                // Só fica verde se em TODOS os períodos todas as atividades foram concluídas (sem pendências em nenhum período)
                if ($info['completed'] > 0 && $info['pending'] === 0 && $info['inProgress'] === 0) {
                    $color = '#10B981'; // Verde: todos os períodos 100% concluídos
                } elseif ($info['completed'] > 0 || $info['inProgress'] > 0 || $info['qtd_sum'] > 0) {
                    $color = '#F59E0B'; // Amarelo: parcialmente concluído / algum período ficou pendente
                } else {
                    $color = '#EF4444'; // Vermelho: nunca nada executado
                }
            }
            // Se todos pendentes => vermelho já
            $treemap[] = [
                'site' => $site,
                'value' => $value,
                'machine_count' => $info['machine_count'],
                'qtd_sum' => $info['qtd_sum'],
                'total' => $info['total'],
                'completed' => $info['completed'],
                'inProgress' => $info['inProgress'],
                'pending' => $info['pending'],
                'color' => $color,
                'restam' => max(0, $info['machine_count'] - $info['qtd_sum']),
                'pct' => $info['machine_count'] > 0 ? (int) round(($info['qtd_sum'] / $info['machine_count']) * 100) : 0,
            ];
        }

        // Ordenar treemap por site para estabilidade
        usort($treemap, function ($a, $b) {
            return strcmp($a['site'], $b['site']);
        });

        arsort($statusBreakdown);

        return [
            'total' => $total,
            'completed' => $completed,
            'inProgress' => $inProgress,
            'pending' => $pending,
            'statusBreakdown' => $statusBreakdown,
            'treemap' => $treemap,
            'allRows' => $allRows,
        ];
    }

    public static function statusColors(): array
    {
        return self::STATUS_COLORS;
    }

    public static function treemapColor(string $status): string
    {
        $key = mb_strtolower(trim($status), 'UTF-8');
        return self::STATUS_COLORS[$key] ?? '#EF4444';
    }
}
