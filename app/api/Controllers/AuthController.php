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

            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            if (self::isRateLimited($ip)) {
                Response::error('Muitas tentativas. Tente novamente em 5 minutos.', 429);
            }

            if (!Env::get('APP_DEBUG', false)) {
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
                Response::error('Erro interno: JWT_SECRET não configurado', 500);
            }

            $result = AuthService::login($username, $password, $jwtSecret);

            self::logAttempt($ip, false);

            if (!$result) {
                sleep(1);
                Response::unauthorized('Usuário ou senha inválidos');
            }

            self::logAttempt($ip, true);

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

    private static function isRateLimited(string $ip): bool
    {
        $conn = Database::connect();
        $stmt = $conn->prepare(
            'SELECT COUNT(*) AS attempts FROM login_attempts
             WHERE ip_address = ? AND success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
        );
        $stmt->bind_param('s', $ip);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        return ($result['attempts'] ?? 0) >= 5;
    }

    private static function logAttempt(string $ip, bool $success): void
    {
        $conn = Database::connect();
        $stmt = $conn->prepare(
            'INSERT INTO login_attempts (ip_address, success) VALUES (?, ?)'
        );
        $stmt->bind_param('si', $ip, $success);
        $stmt->execute();
        $stmt->close();
    }
}
