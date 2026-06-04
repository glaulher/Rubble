<?php

namespace App\Api\Controllers;

use App\Api\Auth\AuthService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\TurnstileHelper;
use App\Api\Helpers\RateLimiter;
use App\Config\Env;
use Exception;

class AuthController
{
    public function login(): void
    {
        try {
            $data = Request::body();

            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                Response::validation('Usuário e senha são obrigatórios');
            }

            $rawIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $ip = trim(explode(',', $rawIp)[0]);

            if (RateLimiter::isLimited($ip, 'auth:login', 5, 300)) {
                Response::error('Muitas tentativas. Tente novamente em 5 minutos.', 429);
            }

            if (Env::get('APP_DEBUG', 'false') !== 'true') {
                $secretKey = Env::get('TURNSTILE_SECRET_KEY', '');
                if (!empty($secretKey)) {
                    $turnstileToken = $data['turnstile_token'] ?? '';
                    if (empty($turnstileToken) || !TurnstileHelper::verify($turnstileToken, $secretKey)) {
                        Response::error('Falha na verificação de segurança', 403);
                    }
                }
            }

            $jwtSecret = Env::get('JWT_SECRET', '');
            if (empty($jwtSecret)) {
                Response::error('Erro interno do servidor', 500);
            }

            $result = AuthService::login($username, $password, $jwtSecret);

            if (!$result) {
                RateLimiter::hit($ip, 'auth:login');
                sleep(1);
                Response::unauthorized('Usuário ou senha inválidos');
            }

            Response::success('Login realizado com sucesso', $result);
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            Response::error('Erro interno do servidor');
        }
    }

    public function me(): void
    {
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
            Response::error('Erro interno do servidor', 500);
        }
        $user = AuthService::validateToken($parts[1], $jwtSecret);

        if (!$user) {
            Response::unauthorized('Token inválido ou expirado');
        }

        Response::success('Usuário autenticado', [
            'user' => [
                'id' => $user->user_id,
                'username' => $user->username,
                'nome' => $user->nome,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(): void
    {
        $authHeader = AuthService::getAuthHeader();
        if (!empty($authHeader)) {
            $parts = explode(' ', $authHeader);
            if (count($parts) === 2 && $parts[0] === 'Bearer') {
                $jwtSecret = Env::get('JWT_SECRET', '');
                if (!empty($jwtSecret)) {
                    $payload = AuthService::validateToken($parts[1], $jwtSecret);
                    if ($payload) {
                        AuthService::blacklistToken($payload);
                    }
                }
            }
        }
        Response::success('Logout realizado com sucesso');
    }
}
