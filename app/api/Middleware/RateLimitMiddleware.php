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
    ];

    public function handle(string $route, string $method): void
    {
        if (!isset(self::LIMITS[$route][$method])) {
            return;
        }

        $rawIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        $ip = trim(explode(',', $rawIp)[0]);
        $endpoint = $route . ':' . $method;
        $maxAttempts = self::LIMITS[$route][$method];

        if (RateLimiter::isLimited($ip, $endpoint, $maxAttempts, 60)) {
            Response::error('Muitas requisições. Aguarde um momento.', 429);
        }
    }
}
