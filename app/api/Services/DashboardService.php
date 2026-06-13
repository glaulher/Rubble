<?php

namespace App\Api\Services;

use App\Api\Repositories\DashboardRepository;

class DashboardService
{
    private DashboardRepository $repository;

    private const STATUS_MAP = [
        'Concluído' => 'completed',
        'concluido' => 'completed',
        'Pendente' => 'pending',
        'pendente' => 'pending',
        'Planejado' => 'planned',
        'planejado' => 'planned',
        'Em andamento' => 'pending',
        'em andamento' => 'pending',
        'Projeto Clean Up' => 'planned',
        'projeto clean up' => 'planned',
    ];

    public function __construct(?DashboardRepository $repository = null)
    {
        $this->repository = $repository ?? new DashboardRepository();
    }

    public function getStats(): array
    {
        $rawCounts = $this->repository->statusCounts();

        $statusCounts = [
            'pending' => 0,
            'planned' => 0,
            'completed' => 0,
        ];

        foreach ($rawCounts as $status => $count) {
            $bucket = self::STATUS_MAP[$status] ?? self::STATUS_MAP[mb_strtolower($status, 'UTF-8')] ?? 'pending';
            $statusCounts[$bucket] += $count;
        }

        $totalTickets = array_sum($statusCounts);

        $topSites = $this->repository->topSites();
        $topMachines = $this->repository->topMachines();
        $topTechnicians = $this->repository->topTechnicians();

        $resolutionByMachine = $this->repository->avgResolutionByMachine();
        $resolutionByMonth = $this->repository->avgResolutionByMonth();
        $resolutionByTechnician = $this->repository->avgResolutionByTechnician();

        return [
            'statusCounts' => $statusCounts,
            'totalTickets' => $totalTickets,
            'topSites' => $topSites,
            'topMachines' => $topMachines,
            'topTechnicians' => $topTechnicians,
            'resolutionByMachine' => $resolutionByMachine,
            'resolutionByMonth' => $resolutionByMonth,
            'resolutionByTechnician' => $resolutionByTechnician,
        ];
    }
}
