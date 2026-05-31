<?php

namespace App\Api\Services;

use App\Api\Repositories\DashboardRepository;

class DashboardService
{
    private DashboardRepository $repository;

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
            if (stripos($status, 'conclu') !== false) {
                $statusCounts['completed'] += $count;
            } elseif (stripos($status, 'pendente') !== false) {
                $statusCounts['pending'] += $count;
            } elseif (stripos($status, 'planej') !== false) {
                $statusCounts['planned'] += $count;
            }
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
