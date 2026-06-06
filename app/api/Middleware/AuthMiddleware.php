<?php

namespace App\Api\Middleware;

use App\Config\Env;
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
    }

    public function getUser(): ?object
    {
        return $this->user;
    }
}
