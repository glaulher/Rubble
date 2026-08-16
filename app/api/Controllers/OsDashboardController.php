<?php

namespace App\Api\Controllers;

use App\Api\Services\OsDashboardService;
use App\Api\Helpers\{Response, Cache};

class OsDashboardController
{
    private OsDashboardService $service;

    public function __construct(?OsDashboardService $service = null)
    {
        $this->service = $service ?? new OsDashboardService();
    }

    public function stats(): void
    {
        try {
            $cacheKey = 'os_dashboard:stats';

            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json(['success' => true, 'data' => $cached]);
                return;
            }

            $data = $this->service->getStats();

            Cache::set($cacheKey, $data, 10);

            Response::json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
