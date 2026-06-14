<?php

namespace App\Api\Helpers;

use App\Config\Database;

class RateLimiter
{
    private static int $lastCleanup = 0;

    public static function isLimited(string $ip, string $endpoint, int $maxAttempts, int $windowSeconds = 60): bool
    {
        $conn = Database::connect();

        $now = time();
        if (($now - self::$lastCleanup) > 300) {
            $conn->query('DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR)');
            self::$lastCleanup = $now;
        }

        $windowStart = date('Y-m-d H:i:s', time() - $windowSeconds);

        $stmt = $conn->prepare(
            'SELECT attempt_count FROM rate_limits
             WHERE ip_address = ? AND endpoint = ? AND window_start >= ?
             ORDER BY window_start DESC LIMIT 1'
        );
        $stmt->bind_param('sss', $ip, $endpoint, $windowStart);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        return $result ? ($result['attempt_count'] >= $maxAttempts) : false;
    }

    public static function hit(string $ip, string $endpoint, int $windowSeconds = 60): void
    {
        $conn = Database::connect();

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
