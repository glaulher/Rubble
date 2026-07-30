<?php

namespace App\Api\Repositories;

use App\Api\Entities\Ticket;

class TicketRepository extends BaseRepository
{

    public function listByItem(int $itemId, string $statusOrderSql = ''): array
    {
        $orderBy = 'id DESC';
        if ($statusOrderSql !== '') {
            $orderBy = $statusOrderSql . ', id DESC';
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

    public function listByItems(array $ids, string $statusOrderSql = ''): array
    {
        if (empty($ids)) {
            return [];
        }

        $ids = array_map('intval', $ids);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

        $orderBy = 'id DESC';
        if ($statusOrderSql !== '') {
            $orderBy = $statusOrderSql . ', id DESC';
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
        $tipo = $data['tipo'] ?? null;
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
        $notifEnv = $data['notificacao_enviada'];
        $sql = "
            UPDATE registros
            SET os = ?, data = ?, equipe = ?, status = ?, data_concluido = ?, data_planejada = ?, material = ?, obs = ?, notificacao_enviada = ?
            WHERE id = ?
        ";

        $stmt = $this->safePrepare($sql);
        $completionDate = $data['data_concluido'] ?? null;
        $plannedDate = $data['data_planejada'] ?? null;
        $stmt->bind_param(
            'sssssssssi',
            $data['os'],
            $data['data'],
            $data['equipe'],
            $data['status'],
            $completionDate,
            $plannedDate,
            $data['material'],
            $data['obs'],
            $notifEnv,
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

    public function findByOsAndEquipment(string $os, int $equipamentoId): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE os = ? AND equipamento_id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $os, $equipamentoId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function findInfratelByEquipment(int $equipmentId): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE equipamento_id = ? AND os LIKE 'INFRATEL%' LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $equipmentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row ? new Ticket($row) : null;
    }

    public function getNextInfratelNumber(): int
    {
        $sql = "SELECT MAX(CAST(SUBSTRING(os, 9) AS UNSIGNED)) AS max_num FROM registros WHERE os LIKE 'INFRATEL%'";
        $stmt = $this->safePrepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['max_num'] ?? 0);
    }

    public function listPendingBySite(
        int $limit,
        ?string $lastLocal,
        ?int $lastId,
        string $search,
        string $status
    ): array {
        $statusList = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];

        $where = 'r.status IN (\'' . implode("','", $statusList) . '\')';
        $params = [];
        $types = '';

        if ($status !== '') {
            $where .= ' AND r.status = ?';
            $params[] = $status;
            $types .= 's';
        }

        if ($search !== '') {
            $likeSearch = '%' . $search . '%';
            $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR r.os LIKE ? OR r.obs LIKE ? OR r.material LIKE ?)';
            $params = array_merge($params, [$likeSearch, $likeSearch, $likeSearch, $likeSearch, $likeSearch]);
            $types .= 'sssss';
        }

        if ($lastLocal !== null && $lastId !== null) {
            $where .= ' AND (e.local > ? OR (e.local = ? AND r.id < ?))';
            $params[] = $lastLocal;
            $params[] = $lastLocal;
            $params[] = $lastId;
            $types .= 'ssi';
        }

        $limitParam = $limit;
        $params[] = $limitParam;
        $types .= 'i';

        $sql = "
            SELECT r.*, e.local, e.equipamento, e.localidade
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE {$where}
            ORDER BY e.local, r.id DESC
            LIMIT ?
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();

        $records = [];
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }

        return $records;
    }

    public function countPending(string $search, string $status): int
    {
        $statusList = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];

        $where = 'r.status IN (\'' . implode("','", $statusList) . '\')';
        $params = [];
        $types = '';

        if ($status !== '') {
            $where .= ' AND r.status = ?';
            $params[] = $status;
            $types .= 's';
        }

        if ($search !== '') {
            $likeSearch = '%' . $search . '%';
            $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR r.os LIKE ? OR r.obs LIKE ? OR r.material LIKE ?)';
            $params = array_merge($params, [$likeSearch, $likeSearch, $likeSearch, $likeSearch, $likeSearch]);
            $types .= 'sssss';
        }

        $sql = "
            SELECT COUNT(*) AS total
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE {$where}
        ";

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return (int) ($row['total'] ?? 0);
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
}
