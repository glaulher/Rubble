<?php

namespace App\Api\Repositories;

class AuditRepository extends BaseRepository
{
    public function insertAccessLog(
        ?int $userId,
        string $username,
        ?string $nome,
        ?string $role,
        string $eventType,
        string $ipAddress,
        ?string $userAgent,
        ?string $failureReason
    ): bool {
        try {
            $stmt = $this->safePrepare(
                "INSERT INTO access_logs (user_id, username, nome, role, event_type, ip_address, user_agent, failure_reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param('isssssss', $userId, $username, $nome, $role, $eventType, $ipAddress, $userAgent, $failureReason);
            $success = $stmt->execute();
            $stmt->close();
            return $success;
        } catch (\Throwable $e) {
            error_log("Failed to insert access log: " . $e->getMessage());
            return false;
        }
    }

    public function insertAuditLog(
        ?int $userId,
        string $username,
        ?string $nome,
        ?string $role,
        string $module,
        string $action,
        ?string $recordId,
        string $summary,
        ?string $oldValues,
        ?string $newValues,
        string $ipAddress
    ): bool {
        try {
            $stmt = $this->safePrepare(
                "INSERT INTO audit_logs (user_id, username, nome, role, module, action, record_id, summary, old_values, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param('issssssssss', $userId, $username, $nome, $role, $module, $action, $recordId, $summary, $oldValues, $newValues, $ipAddress);
            $success = $stmt->execute();
            $stmt->close();
            return $success;
        } catch (\Throwable $e) {
            error_log("Failed to insert audit log: " . $e->getMessage());
            return false;
        }
    }

    public function getAccessLogs(array $filters, int $limit, int $offset): array
    {
        [$whereClause, $types, $params] = $this->buildAccessWhere($filters);

        $sql = "SELECT id, user_id, username, nome, role, event_type, ip_address, user_agent, failure_reason, created_at
                FROM access_logs
                {$whereClause}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function countAccessLogs(array $filters): int
    {
        [$whereClause, $types, $params] = $this->buildAccessWhere($filters);

        $sql = "SELECT COUNT(*) as total FROM access_logs {$whereClause}";
        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int)($row['total'] ?? 0);
    }

    public function getAuditLogs(array $filters, int $limit, int $offset): array
    {
        [$whereClause, $types, $params] = $this->buildAuditWhere($filters);

        $sql = "SELECT id, user_id, username, nome, role, module, action, record_id, summary, ip_address, created_at,
                       (CASE WHEN old_values IS NOT NULL OR new_values IS NOT NULL THEN 1 ELSE 0 END) AS has_diff
                FROM audit_logs
                {$whereClause}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function countAuditLogs(array $filters): int
    {
        [$whereClause, $types, $params] = $this->buildAuditWhere($filters);

        $sql = "SELECT COUNT(*) as total FROM audit_logs {$whereClause}";
        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int)($row['total'] ?? 0);
    }

    public function getAuditLogById(int $id): ?array
    {
        $stmt = $this->safePrepare(
            "SELECT id, user_id, username, nome, role, module, action, record_id, summary, old_values, new_values, ip_address, created_at
             FROM audit_logs
             WHERE id = ?"
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public function getStats(): array
    {
        // 1. Online users (<15 min)
        $online = 0;
        try {
            $stmt = $this->safePrepare(
                "SELECT COUNT(*) as total FROM user_activity WHERE last_activity > DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
            );
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            $online = (int)($res['total'] ?? 0);
            $stmt->close();
        } catch (\Throwable $e) {
            // ignore
        }

        // 2. Logins today & failed logins today
        $loginsToday = 0;
        $failedLoginsToday = 0;
        try {
            $stmt = $this->safePrepare(
                "SELECT 
                    SUM(CASE WHEN event_type = 'login_success' THEN 1 ELSE 0 END) AS success_count,
                    SUM(CASE WHEN event_type = 'login_failed' THEN 1 ELSE 0 END) AS failed_count
                 FROM access_logs
                 WHERE created_at >= CURDATE()"
            );
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            $loginsToday = (int)($res['success_count'] ?? 0);
            $failedLoginsToday = (int)($res['failed_count'] ?? 0);
            $stmt->close();
        } catch (\Throwable $e) {
            // ignore
        }

        // 3. Changes today
        $changesToday = 0;
        try {
            $stmt = $this->safePrepare(
                "SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= CURDATE()"
            );
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            $changesToday = (int)($res['total'] ?? 0);
            $stmt->close();
        } catch (\Throwable $e) {
            // ignore
        }

        return [
            'online_users' => $online,
            'logins_today' => $loginsToday,
            'failed_logins_today' => $failedLoginsToday,
            'changes_today' => $changesToday,
        ];
    }

    public function getActiveSessions(): array
    {
        $stmt = $this->safePrepare(
            "SELECT user_id, username, nome, role, last_activity, ip_address,
                    TIMESTAMPDIFF(MINUTE, last_activity, NOW()) as minutes_ago
             FROM user_activity
             WHERE last_activity > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
             ORDER BY last_activity DESC"
        );
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    private function buildAccessWhere(array $filters): array
    {
        $clauses = [];
        $types = '';
        $params = [];

        if (!empty($filters['event_type'])) {
            $clauses[] = 'event_type = ?';
            $types .= 's';
            $params[] = $filters['event_type'];
        }

        if (!empty($filters['username'])) {
            $clauses[] = '(username LIKE ? OR nome LIKE ?)';
            $types .= 'ss';
            $like = '%' . $filters['username'] . '%';
            $params[] = $like;
            $params[] = $like;
        }

        if (!empty($filters['date_from'])) {
            $clauses[] = 'created_at >= ?';
            $types .= 's';
            $params[] = $filters['date_from'] . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $clauses[] = 'created_at <= ?';
            $types .= 's';
            $params[] = $filters['date_to'] . ' 23:59:59';
        }

        if (!empty($filters['search'])) {
            $clauses[] = '(username LIKE ? OR nome LIKE ? OR ip_address LIKE ? OR failure_reason LIKE ?)';
            $types .= 'ssss';
            $searchLike = '%' . $filters['search'] . '%';
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
        }

        $where = empty($clauses) ? '' : 'WHERE ' . implode(' AND ', $clauses);
        return [$where, $types, $params];
    }

    private function buildAuditWhere(array $filters): array
    {
        $clauses = [];
        $types = '';
        $params = [];

        if (!empty($filters['module'])) {
            $clauses[] = 'module = ?';
            $types .= 's';
            $params[] = $filters['module'];
        }

        if (!empty($filters['action'])) {
            $clauses[] = 'action = ?';
            $types .= 's';
            $params[] = $filters['action'];
        }

        if (!empty($filters['username'])) {
            $clauses[] = '(username LIKE ? OR nome LIKE ?)';
            $types .= 'ss';
            $like = '%' . $filters['username'] . '%';
            $params[] = $like;
            $params[] = $like;
        }

        if (!empty($filters['date_from'])) {
            $clauses[] = 'created_at >= ?';
            $types .= 's';
            $params[] = $filters['date_from'] . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $clauses[] = 'created_at <= ?';
            $types .= 's';
            $params[] = $filters['date_to'] . ' 23:59:59';
        }

        if (!empty($filters['search'])) {
            $clauses[] = '(summary LIKE ? OR record_id LIKE ? OR username LIKE ? OR nome LIKE ? OR ip_address LIKE ?)';
            $types .= 'sssss';
            $searchLike = '%' . $filters['search'] . '%';
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
        }

        $where = empty($clauses) ? '' : 'WHERE ' . implode(' AND ', $clauses);
        return [$where, $types, $params];
    }
}
