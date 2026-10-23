<?php

namespace App\Api\Middleware;

use App\Api\Helpers\RateLimiter;
use App\Api\Helpers\Response;

class RateLimitMiddleware
{
    private const LIMITS = [
        'pv'                   => ['POST' => 30, 'PUT' => 30, 'PATCH' => 30, 'DELETE' => 10],
        'tickets'              => ['POST' => 10, 'PUT' => 10, 'DELETE' => 10],
        'users'                => ['POST' => 10, 'PUT' => 10, 'DELETE' => 10],
        'equipment-management' => ['POST' => 10, 'PUT' => 10, 'DELETE' => 10],
        'scm'                  => ['POST' => 5, 'DELETE' => 10],
        'preventive-cycle'     => ['POST' => 10],
        'auth'                 => ['POST' => 5],
        'planned-activities'   => ['POST' => 10, 'DELETE' => 10],
        'inventory'            => ['POST' => 10, 'PUT' => 10, 'DELETE' => 10],
        // Auditoria 2026-10-16 — 7 rotas que faltavam:
        'filter-exchanges'     => ['POST' => 10, 'PATCH' => 10, 'DELETE' => 10],
        'pending-tickets'      => ['POST' => 10, 'PATCH' => 10, 'DELETE' => 10],
        'preventiva'           => ['POST' => 10, 'DELETE' => 10],
        'equipment-prices'     => ['POST' => 10, 'PUT' => 10, 'DELETE' => 10],
        'pdf-audit'            => ['POST' => 5],
        'preditiva-parse'      => ['POST' => 5],
        'notify'               => ['GET' => 5],
        'diario'               => ['POST' => 10, 'PUT' => 30, 'PATCH' => 30, 'DELETE' => 10],
    ];

    public function handle(string $route, string $method): void
    {
        if (!isset(self::LIMITS[$route][$method])) {
            return;
        }

        $ip = RateLimiter::getClientIp();
        $endpoint = $route . ':' . $method;
        $maxAttempts = self::LIMITS[$route][$method];

        if (RateLimiter::isLimited($ip, $endpoint, $maxAttempts, 60)) {
            Response::error('Muitas requisições. Aguarde um momento.', 429);
        }

        RateLimiter::hit($ip, $endpoint, 60);
    }
}
