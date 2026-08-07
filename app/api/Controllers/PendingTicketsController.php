<?php

namespace App\Api\Controllers;

use App\Api\Helpers\Response;
use App\Api\Helpers\Cache;
use App\Api\Helpers\Request;
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
            $offset = isset($_GET['offset']) ? max((int) $_GET['offset'], 0) : 0;
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';
            $os = $_GET['os'] ?? '';
            $sortBy = trim($_GET['sort_by'] ?? '') ?: 'e.local';
            $sortDir = trim($_GET['sort_dir'] ?? '') ?: 'ASC';

            if (!in_array($sortBy, PendingTicketService::ALLOWED_SORT, true)) {
                $sortBy = 'e.local';
            }
            if (!in_array(strtoupper($sortDir), PendingTicketService::ALLOWED_DIRS, true)) {
                $sortDir = 'ASC';
            }

            $cacheKey = 'pending_tickets:' . md5(json_encode([$limit, $offset, $search, $status, $os, $sortBy, $sortDir]));

            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json(['success' => true, 'data' => $cached]);
                return;
            }

            $result = $this->service->listPendingBySite($limit, $offset, $search, $status, $sortBy, $sortDir, $os);

            Cache::set($cacheKey, $result, 10);

            Response::json(['success' => true, 'data' => $result]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function updateField(): void
    {
        try {
            $data = Request::body();

            $id = $data['id'] ?? null;
            $field = $data['field'] ?? '';
            $value = $data['value'] ?? null;

            if ($id === null || !is_numeric($id)) {
                Response::error('Campo id obrigatório', 400);
                return;
            }
            if (!is_string($field) || $field === '') {
                Response::error('Campo field obrigatório', 400);
                return;
            }

            $this->service->updatePendingField((int) $id, $field, $value);

            Cache::deleteByPrefix('pending_tickets:');
            Cache::deleteByPrefix('equipment_list:');

            Response::success('Campo atualizado com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
