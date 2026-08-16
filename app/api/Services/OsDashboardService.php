<?php

namespace App\Api\Services;

use App\Api\Repositories\OsDashboardRepository;

class OsDashboardService
{
    private OsDashboardRepository $repository;

    private const PRIORITY_KEYS = ['0', '0-A', '0-B', '0-C', '0-D', '0-E', '1', '3', '4', '5'];

    private const PRIORITY_LABELS = [
        '0' => '0', '0-A' => '0-A', '0-B' => '0-B', '0-C' => '0-C',
        '0-D' => '0-D', '0-E' => '0-E', '1' => '1', '3' => '3',
        '4' => '4', '5' => '5',
    ];

    private const PRIORITY_COLORS = [
        '0' => '#EF4444', '0-A' => '#EF4444', '0-B' => '#EF4444',
        '0-C' => '#EF4444', '0-D' => '#EF4444', '0-E' => '#EF4444',
        '1' => '#F59E0B', '3' => '#3B82F6', '4' => '#8B5CF6', '5' => '#94A3B8',
    ];

    private const STATUS_COLORS = [
        'concluido' => '#10B981', 'concluído' => '#10B981',
        'pendente' => '#EF4444',
        'planejado' => '#F59E0B',
        'em andamento' => '#3B82F6',
        'cancelado' => '#6B7280',
        'projeto clean up' => '#8B5CF6',
    ];

    public function __construct(?OsDashboardRepository $repository = null)
    {
        $this->repository = $repository ?? new OsDashboardRepository();
    }

    public function getStats(): array
    {
        $rows = $this->repository->listAllForDashboard();

        $total = count($rows);
        $completed = 0;
        $pending = 0;
        $inProgress = 0;
        $cancelled = 0;

        $responsibilityCounts = [];
        $priorityBreakdown = [];
        $completedPriorityBreakdown = [];
        $statusBreakdown = [];
        $emAndamentoOS = [];
        $responsabilidadeClaroOS = [];
        $technicians = [];
        $dailyActive = [];
        $firstDate = null;
        $today = date('Y-m-d');

        foreach (self::PRIORITY_KEYS as $k) {
            $priorityBreakdown[$k] = 0;
            $completedPriorityBreakdown[$k] = 0;
        }

        foreach ($rows as $row) {
            $status = mb_strtolower(trim($row['status'] ?? ''), 'UTF-8');
            $priority = strtoupper(trim($row['prioridade'] ?? ''));
            $responsavel = trim($row['responsavel'] ?? '');
            $equipe = trim($row['equipe'] ?? '');
            $data = $row['data'] ?? null;
            $dataConcluido = $row['data_concluido'] ?? null;

            $isCompleted = ($status === 'concluido' || $status === 'concluído');
            $isCancelled = ($status === 'cancelado');
            $isInProgress = ($status === 'em andamento');

            if ($isCompleted) $completed++;
            elseif ($isCancelled) $cancelled++;
            else $pending++;

            if ($isInProgress) $inProgress++;

            // Status breakdown
            $statusKey = $status !== '' ? $status : 'desconhecido';
            $statusBreakdown[$statusKey] = ($statusBreakdown[$statusKey] ?? 0) + 1;

            // Priority breakdown
            if (isset($priorityBreakdown[$priority])) {
                $priorityBreakdown[$priority]++;
                if ($isCompleted) {
                    $completedPriorityBreakdown[$priority]++;
                }
            }

            // Responsibility counts
            if ($responsavel !== '') {
                if (!isset($responsibilityCounts[$responsavel])) {
                    $responsibilityCounts[$responsavel] = ['total' => 0, 'pending' => 0, 'completed' => 0, 'inProgress' => 0];
                }
                $responsibilityCounts[$responsavel]['total']++;
                if ($isCompleted) $responsibilityCounts[$responsavel]['completed']++;
                elseif (!$isCancelled) $responsibilityCounts[$responsavel]['pending']++;
                if ($isInProgress) $responsibilityCounts[$responsavel]['inProgress']++;
            }

            // Em andamento table
            if ($isInProgress) {
                $emAndamentoOS[] = [
                    'local' => $row['local'] ?? '',
                    'os' => $row['os'] ?? '',
                    'equipamento' => $row['equipamento'] ?? '',
                    'obs' => $row['obs'] ?? '',
                    'prioridade' => $row['prioridade'] ?? '',
                    'equipe' => $row['equipe'] ?? '',
                    'data_prevista_conclusao' => $row['data_prevista_conclusao'] ?? null,
                ];
            }

            // Responsabilidade Claro
            if (mb_strtolower($responsavel, 'UTF-8') === 'claro') {
                $responsabilidadeClaroOS[] = [
                    'local' => $row['local'] ?? '',
                    'os' => $row['os'] ?? '',
                    'equipamento' => $row['equipamento'] ?? '',
                    'localidade' => $row['localidade'] ?? '',
                    'status' => $row['status'] ?? '',
                    'equipe' => $row['equipe'] ?? '',
                    'data' => $row['data'] ?? null,
                    'data_concluido' => $row['data_concluido'] ?? null,
                ];
            }

            // Top technicians
            if ($equipe !== '') {
                $technicians[$equipe] = ($technicians[$equipe] ?? 0) + 1;
            }

            // Evolution data
            if ($data !== null && $data !== '') {
                if ($firstDate === null || $data < $firstDate) {
                    $firstDate = $data;
                }
                $activeCount = &$dailyActive[$data] ?? null;
                if ($activeCount === null) {
                    $dailyActive[$data] = 1;
                } else {
                    $dailyActive[$data]++;
                }

                if ($isCompleted && $dataConcluido !== null && $dataConcluido !== '') {
                    $dailyActive[$dataConcluido] = ($dailyActive[$dataConcluido] ?? 0) - 1;
                }
            }
        }

        // Top 5 technicians
        arsort($technicians);
        $topTechnicians = array_slice($technicians, 0, 5, true);

        // Evolution: cumulative from firstDate to today
        $evolution = [];
        if ($firstDate !== null) {
            $cumulative = 0;
            $current = new \DateTime($firstDate);
            $end = new \DateTime($today);
            $end->modify('+1 day');

            while ($current < $end) {
                $dateKey = $current->format('Y-m-d');
                $cumulative += ($dailyActive[$dateKey] ?? 0);
                $evolution[] = ['date' => $dateKey, 'count' => max(0, $cumulative)];
                $current->modify('+2 day');
            }
        }

        arsort($statusBreakdown);

        return [
            'total' => $total,
            'pending' => $pending,
            'completed' => $completed,
            'inProgress' => $inProgress,
            'cancelled' => $cancelled,
            'responsibilityCounts' => $responsibilityCounts,
            'priorityBreakdown' => $priorityBreakdown,
            'completedPriorityBreakdown' => $completedPriorityBreakdown,
            'statusBreakdown' => $statusBreakdown,
            'emAndamentoOS' => $emAndamentoOS,
            'responsabilidadeClaroOS' => $responsabilidadeClaroOS,
            'topTechnicians' => $topTechnicians,
            'evolution' => $evolution,
            'allRows' => $rows,
        ];
    }

    public static function priorityLabels(): array
    {
        return self::PRIORITY_LABELS;
    }

    public static function priorityColors(): array
    {
        return self::PRIORITY_COLORS;
    }

    public static function statusColors(): array
    {
        return self::STATUS_COLORS;
    }
}
