<?php

namespace App\Api\Middleware;

use App\Config\Env;
use App\Config\Database;
use App\Api\Auth\AuthService;
use App\Api\Helpers\Response;

class AuthMiddleware
{
    private ?object $user = null;

    public function handle(string $route, string $method): void
    {
        $publicRoutes = ['auth', 'config'];

        if (in_array($route, $publicRoutes, true)) {
            return;
        }

        $authHeader = AuthService::getAuthHeader();

        if (empty($authHeader)) {
            Response::unauthorized('Token não fornecido');
        }

        $parts = explode(' ', $authHeader);

        if (count($parts) !== 2 || $parts[0] !== 'Bearer') {
            Response::unauthorized('Formato de token inválido');
        }

        $jwtSecret = Env::get('JWT_SECRET', '');

        if (empty($jwtSecret)) {
            Response::error('Erro interno: JWT_SECRET não configurado', 500);
        }

        $user = AuthService::validateToken($parts[1], $jwtSecret);

        if (!$user) {
            Response::unauthorized('Token inválido ou expirado');
        }

        $action = $_GET['action'] ?? null;

        if (!AuthService::requireRole($user, $route, $method, $action)) {
            Response::error('Permissão negada', 403);
        }

        $this->user = $user;

        $this->trackActivity($user);
    }

    private function trackActivity(object $user): void
    {
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $conn = Database::connect();
            $stmt = $conn->prepare(
                "INSERT INTO user_activity (user_id, username, nome, role, last_activity, ip_address)
                 VALUES (?, ?, ?, ?, NOW(), ?)
                 ON DUPLICATE KEY UPDATE last_activity = NOW(), username = VALUES(username), nome = VALUES(nome), role = VALUES(role), ip_address = VALUES(ip_address)"
            );
            $stmt->bind_param('issss', $user->user_id, $user->username, $user->nome, $user->role, $ip);
            $stmt->execute();
            $stmt->close();
        } catch (\Throwable $e) {
            error_log('Error tracking activity: ' . $e->getMessage());
        }
    }

    public function getUser(): ?object
    {
        return $this->user;
    }
}
