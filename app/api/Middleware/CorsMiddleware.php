<?php

namespace App\Api\Middleware;

use App\Config\Env;
use App\Api\Helpers\Response;

class CorsMiddleware
{
    public function handle(): void
    {
        header('Content-Type: application/json; charset=utf-8');

        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

        $allowedOrigin = Env::get('ALLOWED_ORIGINS', '');

        if (empty($allowedOrigin)) {
            Response::error('CORS not configured', 500);
        }

        if (str_contains($allowedOrigin, "\n") || str_contains($allowedOrigin, "\r")) {
            Response::error('CORS origin inválido', 500);
        }

        if ($allowedOrigin === '*' && Env::get('APP_DEBUG', 'false') !== 'true') {
            Response::error('ALLOWED_ORIGINS=* não permitido em produção', 500);
        }

        header("Access-Control-Allow-Origin: {$allowedOrigin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
