<?php

namespace App\Api\Repositories;

use App\Api\Entities\Ticket;

class PlannedActivityRepository extends BaseRepository
{
    public function listAll(int $limit, int $offset, string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): array
    {
        [$where, $params, $types] = $this->buildFilterClause($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT r.*, e.local, e.equipamento, e.localidade, e.capacidade, e.local_scm
            FROM registros r
            LEFT JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE {$where}
            ORDER BY r.data_planejada DESC, r.id DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $this->safePrepare($sql);

        if ($types !== '') {
            $stmt->bind_param($types . 'ii', ...array_merge($params, [$limit, $offset]));
        } else {
            $stmt->bind_param('ii', $limit, $offset);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }

        return $items;
    }

    public function count(string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): int
    {
        [$where, $params, $types] = $this->buildFilterClause($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT COUNT(*) AS total
            FROM registros r
            LEFT JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE {$where}
        ";

        $stmt = $this->safePrepare($sql);

        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    private function buildFilterClause(string $search, ?string $dateFrom, ?string $dateTo, ?string $status): array
    {
        $where = 'r.data_planejada IS NOT NULL';
        $params = [];
        $types = '';

        if ($dateFrom !== null && $dateFrom !== '') {
            $where .= ' AND r.data_planejada >= ?';
            $params[] = $dateFrom;
            $types .= 's';
        }
        if ($dateTo !== null && $dateTo !== '') {
            $where .= ' AND r.data_planejada <= ?';
            $params[] = $dateTo;
            $types .= 's';
        }
        if ($status !== null && $status !== '') {
            $where .= ' AND LOWER(r.status) = ?';
            $params[] = mb_strtolower($status);
            $types .= 's';
        }

        $search = $this->normalizeDateSearch($search);
        if ($search !== '') {
            $searchTerm = '%' . $search . '%';
            if (mb_strlen($search) >= 3) {
                $safeSearch = $this->conn->real_escape_string($search);
                $where .= " AND (MATCH(e.local, e.equipamento, e.localidade) AGAINST('+{$safeSearch}*' IN BOOLEAN MODE) OR r.obs LIKE ? OR r.os LIKE ? OR r.data_planejada LIKE ?)";
                array_push($params, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'sss';
            } else {
                $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR r.obs LIKE ? OR r.os LIKE ? OR r.data_planejada LIKE ?)';
                array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'ssssss';
            }
        }

        return [$where, $params, $types];
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

    public function createFromPlanning(array $data, string $auditLog): int
    {
        $sql = "
            INSERT INTO registros (
                equipamento_id, os, data, equipe, status, data_planejada, material, obs, origin
            ) VALUES (?, ?, CURDATE(), ?, 'Planejado', ?, ?, ?, 'planning')
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'isssss',
            $data['equipamento_id'],
            $data['os'],
            $data['equipe'],
            $data['data_planejada'],
            $data['material'],
            $auditLog
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function updateToPlanned(int $id, string $dataPlanejada, string $equipe, string $auditLog): bool
    {
        $sql = "
            UPDATE registros
            SET status = 'Planejado', data_planejada = ?, equipe = ?, obs = ?
            WHERE id = ?
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'sssi',
            $dataPlanejada,
            $equipe,
            $auditLog,
            $id
        );
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM registros WHERE id = ? AND data_planejada IS NOT NULL AND origin = 'planning'";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    public function unplan(int $id): bool
    {
        $sql = "UPDATE registros SET status = 'Pendente', data_planejada = NULL WHERE id = ? AND data_planejada IS NOT NULL";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
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

    private function normalizeDateSearch(string $search): string
    {
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $search, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        return $search;
    }
}
