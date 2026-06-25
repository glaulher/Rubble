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

        $stmt = $this->safePrepare($sql);
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

        $stmt = $this->safePrepare($sql);
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

    public function listTicketSummaryByEquipmentIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $ids = array_map('intval', $ids);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

        $sql = "
            SELECT
                equipamento_id,
                COUNT(*) AS total,
                SUM(CASE WHEN LOWER(status) = 'pendente' THEN 1 ELSE 0 END) AS pendente,
                SUM(CASE WHEN LOWER(status) = 'planejado' THEN 1 ELSE 0 END) AS planejado,
                SUM(CASE WHEN LOWER(status) = 'em andamento' THEN 1 ELSE 0 END) AS em_andamento,
                SUM(CASE WHEN LOWER(status) IN ('concluido', 'concluído') THEN 1 ELSE 0 END) AS concluido,
                SUM(CASE WHEN LOWER(status) = 'projeto clean up' THEN 1 ELSE 0 END) AS projeto_clean_up
            FROM registros
            WHERE equipamento_id IN ({$placeholders})
            GROUP BY equipamento_id
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $result = $stmt->get_result();

        $summary = [];
        while ($row = $result->fetch_assoc()) {
            $eqId = (int) $row['equipamento_id'];
            $statuses = [];
            if ((int) $row['projeto_clean_up'] > 0) $statuses[] = 'projeto clean up cleanup clean-up';
            if ((int) $row['pendente'] > 0) $statuses[] = 'pendente';
            if ((int) $row['planejado'] > 0) $statuses[] = 'planejado';
            if ((int) $row['em_andamento'] > 0) $statuses[] = 'em andamento';

            $summary[$eqId] = [
                'total' => (int) $row['total'],
                'searchStatus' => trim(implode(' ', $statuses)),
                'pendente' => (int) $row['pendente'],
                'planejado' => (int) $row['planejado'],
                'em_andamento' => (int) $row['em_andamento'],
                'concluido' => (int) $row['concluido'],
                'projeto_clean_up' => (int) $row['projeto_clean_up'],
            ];
        }

        return $summary;
    }

    public function save(array $data): int
    {
        $tipo = $data['tipo'] ?? 'corretiva';
        $sql = "
            INSERT INTO registros (
                equipamento_id, os, data, equipe, status, data_concluido, data_planejada, material, obs, tipo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->safePrepare($sql);
        $completionDate = $data['data_concluido'] ?? null;
        $plannedDate = $data['data_planejada'] ?? null;
        $stmt->bind_param(
            'isssssssss',
            $data['equipamento_id'],
            $data['os'],
            $data['data'],
            $data['equipe'],
            $data['status'],
            $completionDate,
            $plannedDate,
            $data['material'],
            $data['obs'],
            $tipo
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

        $stmt = $this->safePrepare($sql);
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
        $stmt = $this->safePrepare($sql);
        return $stmt->bind_param('i', $id) && $stmt->execute();
    }

    public function getById(int $id): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function findByOs(string $os): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE os = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
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
                AND r.data_planejada IS NOT NULL
                AND DATE(r.data_planejada) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                AND r.notificacao_enviada = 0
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();

        $records = [];

        while ($row = $result->fetch_assoc()) {
            $records[] = new Ticket($row);
        }

        return $records;
    }

    public function markNotificationSent(int $id): bool
    {
        $sql = "UPDATE registros SET notificacao_enviada = 1 WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    private const ALLOWED_STATUS_KEYS = [
        'projeto clean up', 'planejado', 'pendente', 'em andamento', 'conclu%',
    ];

    private function buildStatusOrderSql(array $priority): string
    {
        // Security boundary: ALLOWED_STATUS_KEYS whitelist with strict in_array()
        // prevents any non-whitelisted value from reaching SQL concatenation.
        // $priority comes from TicketService::STATUS_PRIORITY (hardcoded constants),
        // never from user input. real_escape_string() is defense-in-depth.
        $parts = [];
        foreach ($priority as $status => $weight) {
            if (!in_array($status, self::ALLOWED_STATUS_KEYS, true)) {
                continue;
            }
            $weight = (int) $weight;
            $safe = $this->conn->real_escape_string($status);
            if (str_contains($status, '%')) {
                $parts[] = "WHEN LOWER(status) LIKE '{$safe}' THEN {$weight}";
            } else {
                $parts[] = "WHEN LOWER(status) = '{$safe}' THEN {$weight}";
            }
        }
        $else = count($priority) + 1;
        return 'CASE ' . implode(' ', $parts) . " ELSE {$else} END";
    }
}
