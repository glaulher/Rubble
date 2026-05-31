<?php

namespace App\Api\Controllers;

use App\Api\Services\DashboardService;
use App\Api\Helpers\Response;
use Exception;

class DashboardController
{
    private DashboardService $service;

    public function __construct()
    {
        $this->service = new DashboardService();
    }

    /*
    |--------------------------------------------------------------------------
    | DASHBOARD STATISTICS
    |--------------------------------------------------------------------------
    */

    public function stats(): void
    {
        try {

            $data = $this->service->getStats();

            Response::json([
                'success' => true,
                'statusCounts' => $data['statusCounts'],
                'totalTickets' => $data['totalTickets'],
                'topSites' => $data['topSites'],
                'topMachines' => $data['topMachines'],
                'topTechnicians' => $data['topTechnicians'],
                'resolutionByMachine' => $data['resolutionByMachine'],
                'resolutionByMonth' => $data['resolutionByMonth'],
                'resolutionByTechnician' => $data['resolutionByTechnician'],
            ]);

        } catch (Exception $e) {

            Response::error(
                $e->getMessage()
            );
        }
    }
}
