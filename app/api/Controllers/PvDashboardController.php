<?php

namespace App\Api\Controllers;

use App\Api\Services\PvDashboardService;
use App\Api\Helpers\Response;
use Exception;

class PvDashboardController
{
    private PvDashboardService $service;

    public function __construct()
    {
        $this->service = new PvDashboardService();
    }

    public function stats(): void
    {
        try {
            $periodStart = $_GET['period_start'] ?? null;
            $periodEnd = $_GET['period_end'] ?? null;
            $location = $_GET['location'] ?? null;
            $statusGroup = $_GET['status_group'] ?? null;

            $data = $this->service->getStats($periodStart, $periodEnd, $location, $statusGroup);

            Response::json([
                'success' => true,
                ...$data,
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
