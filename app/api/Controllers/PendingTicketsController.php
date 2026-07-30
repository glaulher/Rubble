<?php

namespace App\Api\Controllers;

use App\Api\Helpers\Response;
use App\Api\Helpers\Cache;
use App\Api\Services\PendingTicketService;

class PendingTicketsController
{
    private PendingTicketService $service;

    public function __construct(?PendingTicketService $service = null)
    {
        $this->service = $service ?? new PendingTicketService();
    }

    public function listAll(): void
    {
        try {
            $limit = isset($_GET['limit']) ? min(max((int) $_GET['limit'], 1), 200) : 20;
            $lastLocal = isset($_GET['lastLocal']) && $_GET['lastLocal'] !== '' ? $_GET['lastLocal'] : null;
            $lastId = isset($_GET['lastId']) ? (int) $_GET['lastId'] : null;
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';

            $cacheKey = 'pending_tickets:' . md5(json_encode([$limit, $lastLocal, $lastId, $search, $status]));

            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json($cached);
                return;
            }

            $result = $this->service->listPendingBySite($limit, $lastLocal, $lastId, $search, $status);

            Cache::set($cacheKey, $result, 10);

            Response::json($result);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
