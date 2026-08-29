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

            if (!isset($siteMap[$site])) {
                $siteMap[$site] = [
                    'site' => $site,
                    'total' => 0,
                    'completed' => 0,
                    'inProgress' => 0,
                    'pending' => 0,
                    'machine_count' => $machineCount,
                    'qtd_sum' => 0,
                    'status' => $status,
                    'statuses' => [],
                ];
            }
            $siteMap[$site]['total']++;
            $siteMap[$site]['qtd_sum'] += $qtd;
            $siteMap[$site]['statuses'][$status] = ($siteMap[$site]['statuses'][$status] ?? 0) + 1;
            if ($isCompleted) {
                $siteMap[$site]['completed']++;
            } elseif ($isInProgress) {
                $siteMap[$site]['inProgress']++;
            } else {
                $siteMap[$site]['pending']++;
            }
            // manter machine_count mais recente
            if ($machineCount > 0) {
                $siteMap[$site]['machine_count'] = $machineCount;
            }

            $allRows[] = $row;
        }

        $totalMachines = 0;
        $completedMachines = 0;
        $inProgressMachines = 0;
        $pendingMachines = 0;
        $statusBreakdown = [];

        foreach ($siteMap as $site => &$info) {
            $mCount = (int) $info['machine_count'];
            if ($mCount <= 0) {
                $mCount = $info['qtd_sum'] > 0 ? $info['qtd_sum'] : $info['total'];
            }
            if ($info['qtd_sum'] > $mCount) {
                $mCount = $info['qtd_sum'];
            }
            $info['machine_count'] = $mCount;

            // 1. Concluídas
            if ($info['qtd_sum'] > 0) {
                $siteCompleted = min($info['qtd_sum'], $mCount);
            } elseif ($info['completed'] > 0 && $info['completed'] === $info['total']) {
                $siteCompleted = $mCount;
            } else {
                $siteCompleted = 0;
            }

            $remaining = max(0, $mCount - $siteCompleted);

            // 2. Em Andamento
            $siteInProgress = 0;
            if ($remaining > 0 && $info['inProgress'] > 0) {
                if ($info['pending'] === 0) {
                    $siteInProgress = $remaining;
                } else {
                    $siteInProgress = (int) max(1, round($remaining * ($info['inProgress'] / ($info['inProgress'] + $info['pending']))));
                    if ($siteInProgress > $remaining) {
                        $siteInProgress = $remaining;
                    }
                }
            }

            // 3. Pendentes
            $sitePending = max(0, $remaining - $siteInProgress);

            $totalMachines += $mCount;
            $completedMachines += $siteCompleted;
            $inProgressMachines += $siteInProgress;
            $pendingMachines += $sitePending;

            // Status breakdown (em quantidade de máquinas)
            if ($siteCompleted > 0) {
                $statusBreakdown['concluído'] = ($statusBreakdown['concluído'] ?? 0) + $siteCompleted;
            }
            if ($siteInProgress > 0) {
                $statusBreakdown['em andamento'] = ($statusBreakdown['em andamento'] ?? 0) + $siteInProgress;
            }
            if ($sitePending > 0) {
                $nonCompletedStatus = 'planejado';
                foreach ($info['statuses'] as $st => $stCount) {
                    if ($st !== 'concluído' && $st !== 'concluido' && $st !== 'em andamento') {
                        $nonCompletedStatus = $st;
                        break;
                    }
                }
                $statusBreakdown[$nonCompletedStatus] = ($statusBreakdown[$nonCompletedStatus] ?? 0) + $sitePending;
            }
        }
        unset($info);

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

        // Ordenar treemap por value DESC (maiores sites primeiro) e site ASC
        usort($treemap, function ($a, $b) {
            if ($b['value'] !== $a['value']) {
                return $b['value'] <=> $a['value'];
            }
            return strcmp($a['site'], $b['site']);
        });

        arsort($statusBreakdown);

        return [
            'total' => $totalMachines,
            'completed' => $completedMachines,
            'inProgress' => $inProgressMachines,
            'pending' => $pendingMachines,
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
