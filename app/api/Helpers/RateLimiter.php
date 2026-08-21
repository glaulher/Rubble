<?php

namespace App\Api\Helpers;

use App\Config\Database;
use App\Config\Env;

class RateLimiter
{
    private static int $lastCleanup = 0;

    public static function getClientIp(): string
    {
        $isDebug = Env::get('APP_DEBUG', 'false') === 'true';
        $rawIp = $isDebug
            ? ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0')
            : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        return trim(explode(',', $rawIp)[0]);
    }

    public static function isLimited(string $ip, string $endpoint, int $maxAttempts, int $windowSeconds = 60): bool
    {
        try {
            $conn = Database::connect();
        } catch (\Throwable $e) {
            error_log("RateLimiter DB connection failed: " . $e->getMessage());
            return true;
        }

        $now = time();
        if (($now - self::$lastCleanup) > 300) {
            $conn->query('DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1000');
            self::$lastCleanup = $now;
        }

        $windowStart = date('Y-m-d H:i:s', time() - $windowSeconds);

        $stmt = $conn->prepare(
            'SELECT COALESCE(SUM(attempt_count), 0) AS total FROM rate_limits
             WHERE ip_address = ? AND endpoint = ? AND window_start >= ?'
        );
        $stmt->bind_param('sss', $ip, $endpoint, $windowStart);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        return $result ? ((int) $result['total'] >= $maxAttempts) : false;
    }

    public static function hit(string $ip, string $endpoint, int $windowSeconds = 60): void
    {
        try {
            $conn = Database::connect();
        } catch (\Throwable $e) {
            error_log("RateLimiter DB connection failed: " . $e->getMessage());
            return;
        }

        $stmt = $conn->prepare(
            'INSERT INTO rate_limits (ip_address, endpoint, window_start, attempt_count)
             VALUES (?, ?, NOW(), 1)
             ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1'
        );
        $stmt->bind_param('ss', $ip, $endpoint);
        $stmt->execute();
        $stmt->close();
    }
}
