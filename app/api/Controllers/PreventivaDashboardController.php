<?php

namespace App\Api\Controllers;

use App\Api\Services\PreventivaDashboardService;
use App\Api\Helpers\{Response, Cache};

class PreventivaDashboardController
{
    private PreventivaDashboardService $service;

    public function __construct(?PreventivaDashboardService $service = null)
    {
        $this->service = $service ?? new PreventivaDashboardService();
    }

    public function stats(): void
    {
        try {
            $dateFrom = isset($_GET['date_from']) ? trim($_GET['date_from']) : null;
            $dateTo = isset($_GET['date_to']) ? trim($_GET['date_to']) : null;
            $status = isset($_GET['status']) ? trim($_GET['status']) : null;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            if ($dateFrom === '') {
                $dateFrom = null;
            }
            if ($dateTo === '') {
                $dateTo = null;
            }
            if ($status === '') {
                $status = null;
            }

            $cacheKey = 'preventiva_dashboard:' . md5(json_encode([$dateFrom, $dateTo, $status, $search]));

            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json(['success' => true, 'data' => $cached]);
                return;
            }

            $data = $this->service->getStats($dateFrom, $dateTo, $status, $search);

            Cache::set($cacheKey, $data, 10);

            Response::json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
