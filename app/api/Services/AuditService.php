<?php

namespace App\Api\Services;

use App\Api\Repositories\AuditRepository;
use App\Api\Helpers\RateLimiter;

class AuditService
{
    private AuditRepository $repository;

    public function __construct(?AuditRepository $repository = null)
    {
        $this->repository = $repository ?? new AuditRepository();
    }

    public static function logAccess(
        string $eventType,
        ?int $userId,
        string $username,
        ?string $nome = null,
        ?string $role = null,
        ?string $failureReason = null
    ): bool {
        try {
            $repo = new AuditRepository();
            $ip = RateLimiter::getClientIp();
            $userAgent = self::parseUserAgent($_SERVER['HTTP_USER_AGENT'] ?? '');

            return $repo->insertAccessLog(
                $userId,
                $username,
                $nome,
                $role,
                $eventType,
                $ip,
                $userAgent,
                $failureReason
            );
        } catch (\Throwable $e) {
            error_log('Error logging access: ' . $e->getMessage());
            return false;
        }
    }

    public static function logChange(
        object|array|null $user,
        string $module,
        ?string $recordId,
        string $action,
        string $summary,
        ?array $oldValues = null,
        ?array $newValues = null
    ): bool {
        try {
            $repo = new AuditRepository();
            $ip = RateLimiter::getClientIp();

            if ($user === null) {
                $user = self::resolveCurrentUser();
            }

            $userArray = is_object($user) ? (array) $user : $user;
            $userId = isset($userArray['user_id']) ? (int) $userArray['user_id'] : ($userArray['id'] ?? null);
            $username = $userArray['username'] ?? 'sistema';
            $nome = $userArray['nome'] ?? null;
            $role = $userArray['role'] ?? null;

            $oldSanitized = $oldValues !== null ? self::sanitizeValues($oldValues) : null;
            $newSanitized = $newValues !== null ? self::sanitizeValues($newValues) : null;

            $oldJson = $oldSanitized !== null ? json_encode($oldSanitized, JSON_UNESCAPED_UNICODE) : null;
            $newJson = $newSanitized !== null ? json_encode($newSanitized, JSON_UNESCAPED_UNICODE) : null;

            return $repo->insertAuditLog(
                $userId,
                $username,
                $nome,
                $role,
                $module,
                $action,
                $recordId,
                $summary,
                $oldJson,
                $newJson,
                $ip
            );
        } catch (\Throwable $e) {
            error_log('Error logging change: ' . $e->getMessage());
            return false;
        }
    }

    public function getStats(): array
    {
        return $this->repository->getStats();
    }

    public function listAuditLogs(array $filters, int $limit, int $offset): array
    {
        $items = $this->repository->getAuditLogs($filters, $limit, $offset);
        $total = $this->repository->countAuditLogs($filters);

        return [
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    public function listAccessLogs(array $filters, int $limit, int $offset): array
    {
        $items = $this->repository->getAccessLogs($filters, $limit, $offset);
        $total = $this->repository->countAccessLogs($filters);

        return [
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    public function getActiveSessions(): array
    {
        return $this->repository->getActiveSessions();
    }

    public function getAuditDetail(int $id): ?array
    {
        $log = $this->repository->getAuditLogById($id);
        if (!$log) {
            return null;
        }

        $old = !empty($log['old_values']) ? json_decode($log['old_values'], true) : [];
        $new = !empty($log['new_values']) ? json_decode($log['new_values'], true) : [];

        // Build a readable diff of changed fields
        $diff = [];
        $allKeys = array_unique(array_merge(array_keys($old ?: []), array_keys($new ?: [])));

        foreach ($allKeys as $key) {
            $oldVal = $old[$key] ?? null;
            $newVal = $new[$key] ?? null;

            if ($oldVal !== $newVal) {
                $diff[$key] = [
                    'old' => $oldVal,
                    'new' => $newVal,
                ];
            }
        }

        $log['diff'] = $diff;
        return $log;
    }

    public static function parseUserAgent(string $ua): string
    {
        if (empty($ua)) {
            return 'Desconhecido';
        }

        $browser = 'Navegador';
        if (preg_match('/Edg\/([0-9.]+)/i', $ua, $matches)) {
            $browser = 'Edge ' . explode('.', $matches[1])[0];
        } elseif (preg_match('/Chrome\/([0-9.]+)/i', $ua, $matches)) {
            $browser = 'Chrome ' . explode('.', $matches[1])[0];
        } elseif (preg_match('/Firefox\/([0-9.]+)/i', $ua, $matches)) {
            $browser = 'Firefox ' . explode('.', $matches[1])[0];
        } elseif (preg_match('/Safari\/([0-9.]+)/i', $ua, $matches)) {
            $browser = 'Safari ' . explode('.', $matches[1])[0];
        } elseif (preg_match('/OPR\/([0-9.]+)/i', $ua, $matches)) {
            $browser = 'Opera ' . explode('.', $matches[1])[0];
        }

        $os = 'Dispositivo';
        if (preg_match('/iPhone|iPad|iPod/i', $ua)) {
            $os = 'iOS';
        } elseif (preg_match('/Android/i', $ua)) {
            $os = 'Android';
        } elseif (preg_match('/Windows NT 10.0/i', $ua)) {
            $os = 'Windows 10/11';
        } elseif (preg_match('/Windows NT 6.3/i', $ua)) {
            $os = 'Windows 8.1';
        } elseif (preg_match('/Windows NT 6.1/i', $ua)) {
            $os = 'Windows 7';
        } elseif (preg_match('/Macintosh|Mac OS X/i', $ua)) {
            $os = 'macOS';
        } elseif (preg_match('/Linux/i', $ua)) {
            $os = 'Linux';
        }

        return "{$browser} ({$os})";
    }

    private static function sanitizeValues(array $values): array
    {
        $sanitized = [];
        $sensitiveKeys = ['password', 'senha', 'token', 'jwt', 'secret', 'turnstile_token'];

        foreach ($values as $k => $v) {
            if (in_array(strtolower($k), $sensitiveKeys, true)) {
                $sanitized[$k] = '[PROTEGIDO]';
            } elseif (is_array($v)) {
                $sanitized[$k] = self::sanitizeValues($v);
            } else {
                $sanitized[$k] = $v;
            }
        }

        return $sanitized;
    }

    public static function resolveCurrentUser(): array
    {
        try {
            $authHeader = \App\Api\Auth\AuthService::getAuthHeader();
            if (!empty($authHeader)) {
                $parts = explode(' ', $authHeader);
                if (count($parts) === 2 && $parts[0] === 'Bearer') {
                    $jwtSecret = \App\Config\Env::get('JWT_SECRET', '');
                    if (!empty($jwtSecret)) {
                        $payload = \App\Api\Auth\AuthService::validateToken($parts[1], $jwtSecret);
                        if ($payload) {
                            return (array) $payload;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            // ignore
        }
        return ['username' => 'sistema', 'role' => 'sistema'];
    }
}
