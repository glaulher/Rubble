<?php

namespace App\Api\Auth;

use App\Config\Database;

class AuthService
{
    public static function getAuthHeader(): string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (!empty($headers['Authorization'])) {
                return $headers['Authorization'];
            }
            if (!empty($headers['authorization'])) {
                return $headers['authorization'];
            }
        }

        return $_SERVER['Authorization'] ?? '';
    }
    public static function login(string $username, string $password, string $jwtSecret): ?array
    {
        $conn = Database::connect();
        $stmt = $conn->prepare("SELECT id, username, password, nome, role FROM usuarios WHERE username = ?");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user) {
            return null;
        }

        if (!password_verify($password, $user['password'])) {
            return null;
        }

        $payload = [
            'user_id' => (int)$user['id'],
            'username' => $user['username'],
            'nome' => $user['nome'],
            'role' => $user['role'],
        ];

        $token = JwtHelper::encode($payload, $jwtSecret, 43200);

        return [
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'nome' => $user['nome'],
                'role' => $user['role'],
            ],
        ];
    }

    public static function validateToken(string $token, string $jwtSecret): ?object
    {
        if (empty($token)) {
            return null;
        }

        return JwtHelper::decode($token, $jwtSecret);
    }

    public static function requireRole(object $user, string $route, string $method, ?string $action): bool
    {
        $role = $user->role ?? '';

        if ($role === 'admin') {
            return true;
        }

        $rolePermissions = [
            'supervisor' => [
                'read' => ['equipment', 'tickets', 'dashboard', 'locals', 'notify', 'auth'],
                'write' => ['equipment', 'tickets'],
            ],
            'coordenador' => [
                'read' => ['equipment', 'tickets', 'dashboard', 'pv', 'pv-dashboard', 'locals', 'notify', 'auth', 'equipment-management'],
                'write' => ['equipment', 'tickets', 'pv', 'equipment-management'],
            ],
            'cliente' => [
                'read' => ['equipment', 'tickets', 'dashboard', 'locals', 'notify'],
                'write' => [],
            ],
        ];

        $perms = $rolePermissions[$role] ?? null;
        if ($perms === null) {
            return false;
        }

        $isWrite = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        if ($isWrite) {
            if ($method === 'DELETE' && $route === 'pv') {
                return $role === 'admin';
            }
            if ($method === 'DELETE' && $route === 'equipment-management') {
                return $role === 'admin';
            }
            if ($route === 'auth' && $method === 'POST') {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
                $action = $body['action'] ?? '';
                if ($action === 'register' || $action === 'delete-user') {
                    return $role === 'admin';
                }
            }
            return in_array($route, $perms['write'], true);
        }

        return in_array($route, $perms['read'], true);
    }
}
