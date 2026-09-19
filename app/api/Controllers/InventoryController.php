<?php
declare(strict_types=1);

namespace App\Api\Controllers;

use App\Api\Services\InventoryService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;

class InventoryController
{
    private InventoryService $service;

    public function __construct(InventoryService $service)
    {
        $this->service = $service;
    }

    public function handle(string $method, array|object|null $user = null): void
    {
        $action = $_GET['action'] ?? null;

        if ($method === 'GET') {
            if ($action === 'get' || (isset($_GET['id']) && $action !== 'technicians' && $action !== 'export-csv')) {
                $this->get();
            } elseif ($action === 'technicians') {
                $this->technicians();
            } elseif ($action === 'export-csv') {
                $this->exportCsv();
            } else {
                $this->list();
            }
        } elseif ($method === 'POST') {
            $this->create($user);
        } elseif ($method === 'PUT') {
            $this->update();
        } elseif ($method === 'DELETE') {
            $this->delete();
        } else {
            Response::json(['success' => false, 'message' => 'Método não permitido.'], 405);
        }
    }

    public function list(): void
    {
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'categoria' => $_GET['categoria'] ?? ''
        ];
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $res = $this->service->list($filters, $limit, $offset);
        Response::json($res);
    }

    public function index(): void
    {
        $this->list();
    }

    public function get(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        $res = $this->service->get($id);
        Response::json($res, $res['success'] ? 200 : 404);
    }

    public function technicians(): void
    {
        $res = $this->service->getTechnicians();
        Response::json($res);
    }

    public function exportCsv(): void
    {
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'categoria' => $_GET['categoria'] ?? ''
        ];
        $limit = max(1, min(10000, (int)($_GET['limit'] ?? 10000)));
        $res = $this->service->list($filters, $limit, 0);
        Response::json($res);
    }

    public function create(array|object|null $user = null): void
    {
        $body = Request::getBody();
        $userId = null;
        if (is_array($user)) {
            $userId = isset($user['id']) ? (int)$user['id'] : (isset($user['user_id']) ? (int)$user['user_id'] : null);
        } elseif (is_object($user)) {
            $userId = isset($user->id) ? (int)$user->id : (isset($user->user_id) ? (int)$user->user_id : null);
        }
        $res = $this->service->create($body, $userId);
        Response::json($res, $res['success'] ? 201 : 400);
    }

    public function update(): void
    {
        $body = Request::getBody();
        $id = (int)($_GET['id'] ?? ($body['id'] ?? 0));
        $res = $this->service->update($id, $body);
        Response::json($res, $res['success'] ? 200 : 400);
    }

    public function delete(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            try {
                $body = Request::getBody();
                $id = (int)($body['id'] ?? 0);
            } catch (\Throwable) {
                $id = 0;
            }
        }
        $res = $this->service->delete($id);
        Response::json($res, $res['success'] ? 200 : 400);
    }
}
