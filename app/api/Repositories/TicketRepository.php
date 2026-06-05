<?php

namespace App\Api\Repositories;

use App\Api\Entities\Ticket;

class TicketRepository extends BaseRepository
{

    public function listByItem(int $itemId, ?array $statusPriority = null): array
    {
        $orderBy = 'id DESC';
        if ($statusPriority) {
            $orderBy = $this->buildStatusOrderSql($statusPriority) . ', id DESC';
        }

        $sql = "
            SELECT *
            FROM registros
            WHERE equipamento_id = ?
            ORDER BY {$orderBy}
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $itemId);
        $stmt->execute();
        $result = $stmt->get_result();

        $records = [];
        while ($row = $result->fetch_assoc()) {
            $records[] = new Ticket($row);
        }

        return $records;
    }

    public function listByItems(array $ids, ?array $statusPriority = null): array
    {
        if (empty($ids)) {
            return [];
        }

        $ids = array_map('intval', $ids);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

        $orderBy = 'id DESC';
        if ($statusPriority) {
            $orderBy = $this->buildStatusOrderSql($statusPriority) . ', id DESC';
        }

        $sql = "
            SELECT *
            FROM registros
            WHERE equipamento_id IN ({$placeholders})
            ORDER BY {$orderBy}
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $result = $stmt->get_result();

        $grouped = [];
        while ($row = $result->fetch_assoc()) {
            $eqId = (int) $row['equipamento_id'];
            $grouped[$eqId][] = new Ticket($row);
        }

        return $grouped;
    }

    public function save(array $data): int
    {
        $sql = "
            INSERT INTO registros (
                equipamento_id, os, data, equipe, status, data_concluido, data_planejada, material, obs
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->conn->prepare($sql);
        $completionDate = $data['data_concluido'] ?? null;
        $plannedDate = $data['data_planejada'] ?? null;
        $stmt->bind_param(
            'issssssss',
            $data['equipamento_id'],
            $data['os'],
            $data['data'],
            $data['equipe'],
            $data['status'],
            $completionDate,
            $plannedDate,
            $data['material'],
            $data['obs']
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function update(array $data): bool
    {
        $sql = "
            UPDATE registros
            SET os = ?, data = ?, equipe = ?, status = ?, data_concluido = ?, data_planejada = ?, material = ?, obs = ?
            WHERE id = ?
        ";

        $stmt = $this->conn->prepare($sql);
        $completionDate = $data['data_concluido'] ?? null;
        $plannedDate = $data['data_planejada'] ?? null;
        $stmt->bind_param(
            'ssssssssi',
            $data['os'],
            $data['data'],
            $data['equipe'],
            $data['status'],
            $completionDate,
            $plannedDate,
            $data['material'],
            $data['obs'],
            $data['id']
        );
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM registros WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        return $stmt->bind_param('i', $id) && $stmt->execute();
    }

    public function getById(int $id): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function findByOs(string $os): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE os = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $os);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function listScheduledToNotify(): array
    {
        $sql = "
            SELECT
                r.*,
                e.local,
                e.equipamento
            FROM registros r
            LEFT JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE
                LOWER(r.status) = 'planejado'
                AND DATE(r.data) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                AND r.notificacao_enviada = 0
        ";

        $result = $this->conn->query($sql);
        if (!$result) {
            error_log('TicketRepository listScheduledToNotify error: ' . $this->conn->error);
            throw new \RuntimeException(
                'Erro interno na consulta'
            );
        }

        $records = [];

        while ($row = $result->fetch_assoc()) {
            $records[] = new Ticket($row);
        }

        return $records;
    }

    public function markNotificationSent(int $id): bool
    {
        $sql = "UPDATE registros SET notificacao_enviada = 1 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    private function buildStatusOrderSql(array $priority): string
    {
        $parts = [];
        foreach ($priority as $status => $weight) {
            if (str_contains($status, '%')) {
                $safe = $this->conn->real_escape_string($status);
                $parts[] = "WHEN LOWER(status) LIKE '{$safe}' THEN {$weight}";
            } else {
                $safe = $this->conn->real_escape_string($status);
                $parts[] = "WHEN LOWER(status) = '{$safe}' THEN {$weight}";
            }
        }
        $else = count($priority) + 1;
        return 'CASE ' . implode(' ', $parts) . " ELSE {$else} END";
    }
}
