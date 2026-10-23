<?php

declare(strict_types=1);

namespace App\Api\Repositories;

use App\Api\Entities\DiarioAtividade;
use mysqli;

class DiarioRepository extends BaseRepository
{
    public const ALLOWED_SORT = [
        'id', 'site', 'equipamento', 'equipamento_id', 'equipamento_nome',
        'localidade', 'os', 'data', 'categoria', 'status', 'equipe', 'created_at',
        'd.id', 'd.site', 'd.localidade', 'd.os', 'd.data', 'd.categoria',
        'd.status', 'd.equipe', 'd.created_at', 'e.equipamento'
    ];

    public const ALLOWED_FIELDS = [
        'site', 'equipamento_id', 'localidade', 'os', 'data', 'categoria', 'status', 'equipe'
    ];

    public function __construct(?mysqli $conn = null)
    {
        if ($conn !== null) {
            $this->conn = $conn;
        } else {
            parent::__construct();
        }
    }

    public function list(array $filters = [], int $limit = 20, int $offset = 0, string $sortBy = 'd.data', string $sortDir = 'DESC'): array
    {
        [$whereSql, $types, $params] = $this->buildFilterConditions($filters);

        $sortMap = [
            'id' => 'd.id',
            'site' => 'd.site',
            'equipamento' => 'e.equipamento',
            'equipamento_nome' => 'e.equipamento',
            'localidade' => 'd.localidade',
            'os' => 'd.os',
            'data' => 'd.data',
            'categoria' => 'd.categoria',
            'status' => 'd.status',
            'equipe' => 'd.equipe',
            'created_at' => 'd.created_at',
            'd.id' => 'd.id',
            'd.site' => 'd.site',
            'd.localidade' => 'd.localidade',
            'd.os' => 'd.os',
            'd.data' => 'd.data',
            'd.categoria' => 'd.categoria',
            'd.status' => 'd.status',
            'd.equipe' => 'd.equipe',
            'd.created_at' => 'd.created_at',
            'e.equipamento' => 'e.equipamento',
        ];

        $orderCol = $sortMap[$sortBy] ?? 'd.data';
        $orderDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $sql = "SELECT d.*, e.equipamento AS equipamento_nome, e.capacidade AS equipamento_capacidade, COALESCE(u.nome, u.username) AS created_by_name
                FROM diario_atividades d
                LEFT JOIN equipamentos e ON d.equipamento_id = e.id
                LEFT JOIN usuarios u ON d.created_by = u.id";

        if ($whereSql !== '') {
            $sql .= " WHERE {$whereSql}";
        }

        $sql .= " ORDER BY {$orderCol} {$orderDir}, d.id DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result();

        $rows = [];
        while ($row = $res->fetch_assoc()) {
            $rows[] = (new DiarioAtividade($row))->toArray();
        }
        $stmt->close();
        return $rows;
    }

    public function count(array $filters = []): int
    {
        [$whereSql, $types, $params] = $this->buildFilterConditions($filters);

        $sql = "SELECT COUNT(*) as total
                FROM diario_atividades d
                LEFT JOIN equipamentos e ON d.equipamento_id = e.id
                LEFT JOIN usuarios u ON d.created_by = u.id";

        if ($whereSql !== '') {
            $sql .= " WHERE {$whereSql}";
        }

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int) ($res['total'] ?? 0);
    }

    public function findById(int $id): ?DiarioAtividade
    {
        $stmt = $this->safePrepare(
            "SELECT d.*, e.equipamento AS equipamento_nome, e.capacidade AS equipamento_capacidade, COALESCE(u.nome, u.username) AS created_by_name
             FROM diario_atividades d
             LEFT JOIN equipamentos e ON d.equipamento_id = e.id
             LEFT JOIN usuarios u ON d.created_by = u.id
             WHERE d.id = ?"
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $res ? new DiarioAtividade($res) : null;
    }

    public function create(array $data, ?int $userId): int
    {
        $stmt = $this->safePrepare(
            "INSERT INTO diario_atividades (site, equipamento_id, localidade, os, data, categoria, status, equipe, obs, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        );

        $site = !empty($data['site']) ? trim((string) $data['site']) : null;
        $equipamentoId = isset($data['equipamento_id']) && $data['equipamento_id'] !== '' && $data['equipamento_id'] !== null
            ? (int) $data['equipamento_id']
            : null;
        $localidade = !empty($data['localidade']) && $data['localidade'] !== 'N/A' ? trim((string) $data['localidade']) : null;
        $os = !empty($data['os']) && $data['os'] !== 'N/A' ? trim((string) $data['os']) : null;
        $dataDate = !empty($data['data']) ? trim((string) $data['data']) : date('Y-m-d');
        $categoria = !empty($data['categoria']) ? trim((string) $data['categoria']) : null;
        $status = !empty($data['status']) ? trim((string) $data['status']) : null;
        $equipe = !empty($data['equipe']) && $data['equipe'] !== 'N/A' ? trim((string) $data['equipe']) : null;
        $obs = isset($data['obs']) && $data['obs'] !== null && trim((string) $data['obs']) !== '' ? (string) $data['obs'] : null;

        $stmt->bind_param(
            'sisssssssi',
            $site,
            $equipamentoId,
            $localidade,
            $os,
            $dataDate,
            $categoria,
            $status,
            $equipe,
            $obs,
            $userId
        );

        $stmt->execute();
        $insertId = (int) $stmt->insert_id;
        $stmt->close();
        return $insertId;
    }

    public function updateField(int $id, string $field, mixed $value): bool
    {
        if (!in_array($field, self::ALLOWED_FIELDS, true)) {
            throw new \InvalidArgumentException("Campo '{$field}' inválido para atualização.");
        }

        // Normalize value (N/A -> null for nullable fields)
        if ($value === 'N/A' || $value === '' || $value === null) {
            $val = null;
        } elseif ($field === 'equipamento_id') {
            $val = is_numeric($value) ? (int) $value : null;
        } else {
            $val = trim((string) $value);
        }

        $stmt = $this->safePrepare(
            "UPDATE diario_atividades SET `{$field}` = ?, updated_at = NOW() WHERE id = ?"
        );

        if ($val === null) {
            $nullVal = null;
            $stmt->bind_param('si', $nullVal, $id);
        } elseif ($field === 'equipamento_id') {
            $stmt->bind_param('ii', $val, $id);
        } else {
            $stmt->bind_param('si', $val, $id);
        }

        $success = $stmt->execute();
        $stmt->close();
        return $success;
    }

    public function updateObs(int $id, string $newObs): bool
    {
        $stmt = $this->safePrepare(
            "UPDATE diario_atividades SET obs = ?, updated_at = NOW() WHERE id = ?"
        );
        $stmt->bind_param('si', $newObs, $id);
        $success = $stmt->execute();
        $stmt->close();
        return $success;
    }

    public function delete(int $id, ?int $userId = null, bool $isAdmin = false): bool
    {
        if ($isAdmin) {
            $stmt = $this->safePrepare("DELETE FROM diario_atividades WHERE id = ?");
            $stmt->bind_param('i', $id);
        } else {
            if ($userId === null) {
                return false;
            }
            $stmt = $this->safePrepare("DELETE FROM diario_atividades WHERE id = ? AND created_by = ?");
            $stmt->bind_param('ii', $id, $userId);
        }

        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected > 0;
    }

    public function lookupOsObs(string $os): ?string
    {
        $cleanOs = trim($os);
        if ($cleanOs === '' || $cleanOs === 'N/A') {
            return null;
        }

        $stmt = $this->safePrepare(
            "SELECT obs FROM registros WHERE os = ? AND obs IS NOT NULL AND obs != '' ORDER BY id DESC LIMIT 1"
        );
        $stmt->bind_param('s', $cleanOs);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $res ? (string) $res['obs'] : null;
    }

    private function buildFilterConditions(array $filters): array
    {
        $where = [];
        $params = [];
        $types = '';

        if (!empty($filters['search'])) {
            $term = '%' . trim((string) $filters['search']) . '%';
            $where[] = '(d.site LIKE ? OR d.os LIKE ? OR d.localidade LIKE ? OR e.equipamento LIKE ? OR d.obs LIKE ? OR d.equipe LIKE ?)';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $types .= 'ssssss';
        }

        if (!empty($filters['status'])) {
            $statusList = is_array($filters['status'])
                ? $filters['status']
                : array_filter(array_map('trim', explode(',', (string) $filters['status'])));
            if (!empty($statusList)) {
                $placeholders = implode(',', array_fill(0, count($statusList), '?'));
                $where[] = "d.status IN ({$placeholders})";
                foreach ($statusList as $st) {
                    $params[] = $st;
                    $types .= 's';
                }
            }
        }

        if (!empty($filters['categoria'])) {
            $catList = is_array($filters['categoria'])
                ? $filters['categoria']
                : array_filter(array_map('trim', explode(',', (string) $filters['categoria'])));
            if (!empty($catList)) {
                $placeholders = implode(',', array_fill(0, count($catList), '?'));
                $where[] = "d.categoria IN ({$placeholders})";
                foreach ($catList as $cat) {
                    $params[] = $cat;
                    $types .= 's';
                }
            }
        }

        if (!empty($filters['data_from'])) {
            $where[] = 'd.data >= ?';
            $params[] = trim((string) $filters['data_from']);
            $types .= 's';
        }

        if (!empty($filters['data_to'])) {
            $where[] = 'd.data <= ?';
            $params[] = trim((string) $filters['data_to']);
            $types .= 's';
        }

        $whereSql = !empty($where) ? implode(' AND ', $where) : '';
        return [$whereSql, $types, $params];
    }
}
