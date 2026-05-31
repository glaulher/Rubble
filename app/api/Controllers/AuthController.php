<?php

namespace App\Api\Controllers;

use App\Api\Auth\AuthService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\TurnstileHelper;
use App\Config\Env;
use App\Config\Database;
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

            $secretKey = Env::get('TURNSTILE_SECRET_KEY', '');
            if (!empty($secretKey)) {
                $turnstileToken = $data['turnstile_token'] ?? '';
                if (empty($turnstileToken) || !TurnstileHelper::verify($turnstileToken, $secretKey)) {
                    Response::error('Falha na verificação de segurança', 403);
                }
            }

            $jwtSecret = Env::get('JWT_SECRET', '');
            if (empty($jwtSecret)) {
                Response::error('Erro interno: JWT_SECRET não configurado', 500);
            }

            $result = AuthService::login($username, $password, $jwtSecret);

            if (!$result) {
                sleep(1);
                Response::unauthorized('Usuário ou senha inválidos');
            }

            Response::success('Login realizado com sucesso', $result);
        } catch (Exception $e) {
            Response::error($e->getMessage());
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
            Response::error('Erro interno: JWT_SECRET não configurado', 500);
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
        Response::success('Logout realizado com sucesso');
    }
}
