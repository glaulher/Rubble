<?php

namespace App\Api\Repositories;

use App\Api\Entities\Ticket;

class PlannedActivityRepository extends BaseRepository
{
    public function listAll(int $limit, int $offset, string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): array
    {
        [$pw, $pp, $pt] = $this->buildPreventivaFilter($search, $dateFrom, $dateTo, $status);
        [$cw, $cp, $ct] = $this->buildCorretivaFilter($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT id, local, equipamento, capacidade, local_scm, localidade, os, data_planejada, equipe, status, obs, tipo, machine_count
            FROM (
                SELECT ap.id, ap.site AS local, '' AS equipamento, '' AS capacidade, '' AS local_scm, '' AS localidade,
                       ap.ticket AS os, ap.data_planejada, ap.equipe, ap.status, ap.obs, 'preventiva' AS tipo,
                       (SELECT COUNT(*) FROM equipamentos WHERE local = ap.site) AS machine_count
                FROM atividades_preventivas ap
                WHERE {$pw}

                UNION ALL

                SELECT r.id, COALESCE(e.local, ''), COALESCE(e.equipamento, ''), COALESCE(e.capacidade, ''),
                       COALESCE(e.local_scm, ''), COALESCE(e.localidade, ''),
                       r.os, r.data_planejada, r.equipe, r.status, r.obs, r.tipo, 0 AS machine_count
                FROM registros r
                LEFT JOIN equipamentos e ON e.id = r.equipamento_id
                WHERE {$cw}
            ) AS combined
            ORDER BY data_planejada DESC, id DESC
            LIMIT ? OFFSET ?
        ";

        $allParams = array_merge($pp, $cp, [$limit, $offset]);
        $allTypes = $pt . $ct . 'ii';

        $stmt = $this->safePrepare($sql);
        if ($allTypes !== '') {
            $stmt->bind_param($allTypes, ...$allParams);
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
        [$pw, $pp, $pt] = $this->buildPreventivaFilter($search, $dateFrom, $dateTo, $status);
        [$cw, $cp, $ct] = $this->buildCorretivaFilter($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT COUNT(*) AS total
            FROM (
                SELECT ap.id FROM atividades_preventivas ap WHERE {$pw}
                UNION ALL
                SELECT r.id FROM registros r LEFT JOIN equipamentos e ON e.id = r.equipamento_id WHERE {$cw}
            ) AS combined
        ";

        $allParams = array_merge($pp, $cp);
        $allTypes = $pt . $ct;

        $stmt = $this->safePrepare($sql);
        if ($allTypes !== '') {
            $stmt->bind_param($allTypes, ...$allParams);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    private function buildCorretivaFilter(string $search, ?string $dateFrom, ?string $dateTo, ?string $status): array
    {
        $where = 'r.data_planejada IS NOT NULL AND r.tipo = \'corretiva\'';
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
                $where .= " AND (MATCH(e.local, e.equipamento, e.localidade) AGAINST('+{$safeSearch}*' IN BOOLEAN MODE) OR r.obs LIKE ? OR r.os LIKE ? OR r.data_planejada LIKE ? OR r.tipo LIKE ?)";
                array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'ssss';
            } else {
                $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR r.obs LIKE ? OR r.os LIKE ? OR r.data_planejada LIKE ? OR r.tipo LIKE ?)';
                array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'sssssss';
            }
        }

        return [$where, $params, $types];
    }

    private function buildPreventivaFilter(string $search, ?string $dateFrom, ?string $dateTo, ?string $status): array
    {
        $where = 'ap.data_planejada IS NOT NULL';
        $params = [];
        $types = '';

        if ($dateFrom !== null && $dateFrom !== '') {
            $where .= ' AND ap.data_planejada >= ?';
            $params[] = $dateFrom;
            $types .= 's';
        }
        if ($dateTo !== null && $dateTo !== '') {
            $where .= ' AND ap.data_planejada <= ?';
            $params[] = $dateTo;
            $types .= 's';
        }
        if ($status !== null && $status !== '') {
            $where .= ' AND LOWER(ap.status) = ?';
            $params[] = mb_strtolower($status);
            $types .= 's';
        }

        $search = $this->normalizeDateSearch($search);
        if ($search !== '') {
            $searchTerm = '%' . $search . '%';
            $where .= ' AND (ap.site LIKE ? OR ap.ticket LIKE ? OR ap.obs LIKE ?)';
            array_push($params, $searchTerm, $searchTerm, $searchTerm);
            $types .= 'sss';
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
        $tipo = $data['tipo'] ?? 'preventiva';
        $sql = "
            INSERT INTO registros (
                equipamento_id, os, data, equipe, status, data_planejada, material, obs, origin, tipo
            ) VALUES (?, ?, CURDATE(), ?, 'Planejado', ?, ?, ?, 'planning', ?)
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'issssss',
            $data['equipamento_id'],
            $data['os'],
            $data['equipe'],
            $data['data_planejada'],
            $data['material'],
            $auditLog,
            $tipo
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function updateToPlanned(int $id, string $dataPlanejada, string $equipe, string $auditLog, string $tipo = 'preventiva'): bool
    {
        $sql = "
            UPDATE registros
            SET status = 'Planejado', data_planejada = ?, equipe = ?, obs = ?, tipo = ?
            WHERE id = ?
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'ssssi',
            $dataPlanejada,
            $equipe,
            $auditLog,
            $tipo,
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

    public function updateTeam(int $id, string $tipo, string $equipe): bool
    {
        $table = $tipo === 'preventiva' ? 'atividades_preventivas' : 'registros';
        $sql = "UPDATE {$table} SET equipe = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $equipe, $id);
        return $stmt->execute();
    }

    private function normalizeDateSearch(string $search): string
    {
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $search, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        return $search;
    }
}
