<?php

declare(strict_types=1);

namespace App\Api\Controllers;

use App\Api\Services\TermoService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;

class TermoController
{
    private TermoService $service;

    public function __construct(TermoService $service)
    {
        $this->service = $service;
    }

    public function handle(string $method, array|object|null $user = null): void
    {
        $action = $_GET['action'] ?? null;

        if ($method === 'GET') {
            if ($action === 'public-view') {
                $this->publicView();
            } elseif ($action === 'get' || isset($_GET['id'])) {
                $this->get();
            } elseif ($action === 'list' || $action === null || $action === '') {
                $this->list();
            } else {
                Response::json(['success' => false, 'message' => 'Ação inválida para GET.'], 400);
            }
        } elseif ($method === 'POST') {
            if ($action === 'public-sign') {
                $this->publicSign();
            } elseif ($action === 'devolver') {
                if (!$user) {
                    Response::json(['success' => false, 'message' => 'Autenticação necessária.'], 401);
                    return;
                }
                $this->devolver();
            } elseif ($action === 'create' || $action === null || $action === '') {
                if (!$user) {
                    Response::json(['success' => false, 'message' => 'Autenticação necessária.'], 401);
                    return;
                }
                $this->create($user);
            } else {
                Response::json(['success' => false, 'message' => 'Ação inválida para POST.'], 400);
            }
        } elseif ($method === 'DELETE') {
            if (!$user) {
                Response::json(['success' => false, 'message' => 'Autenticação necessária.'], 401);
                return;
            }
            $id = (int) ($_GET['id'] ?? 0);
            $this->delete($id);
        } else {
            Response::json(['success' => false, 'message' => 'Método não permitido.'], 405);
        }
    }

    public function publicView(): void
    {
        $token = (string) ($_GET['token'] ?? '');
        $res = $this->service->getPublicTermo($token);
        $statusCode = $res['code'] ?? ($res['success'] ? 200 : 400);
        Response::json($res, $statusCode);
    }

    public function publicSign(): void
    {
        $body = Request::getBody();
        $token = (string) ($body['token'] ?? ($_GET['token'] ?? ''));
        $signature = (string) ($body['signature'] ?? '');
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        $res = $this->service->signPublicTermo($token, $signature, $ip, $userAgent);
        $statusCode = $res['code'] ?? ($res['success'] ? 200 : 400);
        Response::json($res, $statusCode);
    }

    public function create(array|object|null $user = null): void
    {
        $body = Request::getBody();
        $userId = null;
        if (is_array($user)) {
            $userId = isset($user['id']) ? (int) $user['id'] : (isset($user['user_id']) ? (int) $user['user_id'] : null);
        } elseif (is_object($user)) {
            $userId = isset($user->id) ? (int) $user->id : (isset($user->user_id) ? (int) $user->user_id : null);
        }

        $res = $this->service->createTermo($body, $userId);
        Response::json($res, $res['success'] ? 201 : 400);
    }

    public function devolver(): void
    {
        $body = Request::getBody();
        $termoId = (int) ($body['termo_id'] ?? ($_GET['id'] ?? 0));
        $itemIds = (array) ($body['item_ids'] ?? []);
        $dataDevolucao = (string) ($body['data_devolucao'] ?? date('Y-m-d'));
        $obs = !empty($body['observacoes']) ? (string) $body['observacoes'] : null;

        $res = $this->service->devolverItens($termoId, $itemIds, $dataDevolucao, $obs);
        Response::json($res, $res['success'] ? 200 : 400);
    }

    public function delete(int $id): void
    {
        if ($id <= 0) {
            Response::json(['success' => false, 'message' => 'ID do termo não fornecido.'], 400);
            return;
        }

        $res = $this->service->deleteTermo($id);
        Response::json($res, $res['success'] ? 200 : 400);
    }

    public function list(): void
    {
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
        ];
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 20)));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));

        $res = $this->service->list($filters, $limit, $offset);
        Response::json($res);
    }

    public function get(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        $res = $this->service->get($id);
        Response::json($res, $res['success'] ? 200 : 404);
    }
}
