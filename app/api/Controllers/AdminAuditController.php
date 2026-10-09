<?php

namespace App\Api\Controllers;

use App\Api\Services\AuditService;
use App\Api\Helpers\Response;

class AdminAuditController
{
    private AuditService $service;
    private object $currentUser;

    public function __construct(object $currentUser)
    {
        $this->currentUser = $currentUser;
        $this->service = new AuditService();
    }

    private function requireAdmin(): bool
    {
        if (($this->currentUser->role ?? '') !== 'admin') {
            Response::error('Acesso restrito a administradores', 403);
            return false;
        }
        return true;
    }

    public function stats(): void
    {
        if (!$this->requireAdmin()) return;

        try {
            $stats = $this->service->getStats();
            Response::success('Estatísticas carregadas com sucesso', $stats);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function auditLogs(): void
    {
        if (!$this->requireAdmin()) return;

        try {
            $limit = min(max((int)($_GET['limit'] ?? 20), 1), 500);
            $offset = max((int)($_GET['offset'] ?? 0), 0);

            $filters = [
                'module' => trim($_GET['module'] ?? ''),
                'action' => trim($_GET['action_type'] ?? ''),
                'username' => trim($_GET['username'] ?? ''),
                'date_from' => trim($_GET['date_from'] ?? ''),
                'date_to' => trim($_GET['date_to'] ?? ''),
                'search' => trim($_GET['search'] ?? ''),
            ];

            $data = $this->service->listAuditLogs($filters, $limit, $offset);

            Response::json([
                'success' => true,
                'message' => 'Trilha de auditoria carregada',
                'data' => $data['items'],
                'total' => $data['total'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function accessLogs(): void
    {
        if (!$this->requireAdmin()) return;

        try {
            $limit = min(max((int)($_GET['limit'] ?? 20), 1), 500);
            $offset = max((int)($_GET['offset'] ?? 0), 0);

            $filters = [
                'event_type' => trim($_GET['event_type'] ?? ''),
                'username' => trim($_GET['username'] ?? ''),
                'date_from' => trim($_GET['date_from'] ?? ''),
                'date_to' => trim($_GET['date_to'] ?? ''),
                'search' => trim($_GET['search'] ?? ''),
            ];

            $data = $this->service->listAccessLogs($filters, $limit, $offset);

            Response::json([
                'success' => true,
                'message' => 'Logs de acesso carregados',
                'data' => $data['items'],
                'total' => $data['total'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function activeSessions(): void
    {
        if (!$this->requireAdmin()) return;

        try {
            $sessions = $this->service->getActiveSessions();
            Response::success('Sessões ativas recuperadas', $sessions);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function detail(): void
    {
        if (!$this->requireAdmin()) return;

        try {
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                Response::error('ID inválido', 400);
                return;
            }

            $detail = $this->service->getAuditDetail($id);
            if (!$detail) {
                Response::notFound('Registro de auditoria não encontrado');
                return;
            }

            Response::success('Detalhes da auditoria recuperados', $detail);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
