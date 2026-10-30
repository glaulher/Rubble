<?php

namespace App\Api\Repositories;

class SolicitacaoCompraRepository extends BaseRepository
{
    private const SELECT_BASE = "SELECT sc.*, e.equipamento, e.capacidade, e.local, e.localidade,
               pvt.pv_valor_total
        FROM solicitacao_compra sc
        LEFT JOIN equipamentos e ON e.id = sc.equipamento_id
        LEFT JOIN (SELECT p.numero_pv, SUM(pi.valor_total) AS pv_valor_total
                   FROM pv p JOIN pv_item pi ON pi.pv_id = p.id
                   GROUP BY p.numero_pv) pvt ON pvt.numero_pv = sc.numero_pv";

    private const WRITABLE_FIELDS = [
        'titulo_email' => 's',
        'status' => 's',
        'site' => 's',
        'equipamento_id' => 'i',
        'equipamento_texto' => 's',
        'numero_sc' => 's',
        'numero_pc' => 's',
        'numero_pv' => 's',
        'valor_sc' => 'd',
        'data' => 's',
        'data_status' => 's',
        'sla_dias' => 'i',
        'observacao' => 's',
    ];

    public function listAll(int $limit, int $offset, string $search = '', ?string $status = null, ?string $site = null): array
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $site);

        $sql = self::SELECT_BASE . $where . " ORDER BY sc.id DESC LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return $this->fetchAll($stmt->get_result());
    }

    public function count(string $search = '', ?string $status = null, ?string $site = null): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $site);

        $sql = "SELECT COUNT(*) AS total
                FROM solicitacao_compra sc
                LEFT JOIN equipamentos e ON e.id = sc.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    public function statusCounts(): array
    {
        $sql = "SELECT status, COUNT(*) AS total FROM solicitacao_compra GROUP BY status";
        $stmt = $this->safePrepare($sql);
        $stmt->execute();

        $counts = [];
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $counts[(string) $row['status']] = (int) $row['total'];
        }

        return $counts;
    }

    public function getById(int $id): ?array
    {
        $sql = self::SELECT_BASE . " WHERE sc.id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();

        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
    }

    public function listWithSla(): array
    {
        $sql = self::SELECT_BASE . " WHERE sc.sla_dias IS NOT NULL ORDER BY sc.id";
        $stmt = $this->safePrepare($sql);
        $stmt->execute();

        return $this->fetchAll($stmt->get_result());
    }

    public function save(array $data): int
    {
        $fields = array_keys(self::WRITABLE_FIELDS);
        $types = '';
        $params = [];

        foreach (self::WRITABLE_FIELDS as $field => $type) {
            $types .= $type;
            $params[] = $this->normalizeValue($field, $data[$field] ?? null);
        }

        $columns = implode(', ', $fields);
        $placeholders = implode(', ', array_fill(0, count($fields), '?'));

        $sql = "INSERT INTO solicitacao_compra ({$columns}) VALUES ({$placeholders})";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function update(int $id, array $data): bool
    {
        $assignments = [];
        $types = '';
        $params = [];

        foreach (self::WRITABLE_FIELDS as $field => $type) {
            $assignments[] = "{$field} = ?";
            $types .= $type;
            $params[] = $this->normalizeValue($field, $data[$field] ?? null);
        }

        $types .= 'i';
        $params[] = $id;

        $sql = "UPDATE solicitacao_compra SET " . implode(', ', $assignments) . " WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);

        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM solicitacao_compra WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    public function existsByScNumber(string $numeroSc, ?int $ignoreId = null): bool
    {
        $sql = "SELECT id FROM solicitacao_compra WHERE numero_sc = ?";
        $types = 's';
        $params = [$numeroSc];

        if ($ignoreId !== null) {
            $sql .= " AND id != ?";
            $types .= 'i';
            $params[] = $ignoreId;
        }

        $sql .= " LIMIT 1";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }

    public function markSlaNotified(int $id, ?string $dataStatus): void
    {
        $sql = "UPDATE solicitacao_compra
                SET sla_notificado_em = NOW(), sla_notificado_data_status = ?
                WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $dataStatus, $id);
        $stmt->execute();
    }

    /**
     * @return array{0: string, 1: string, 2: array}
     */
    private function buildFilterClause(string $search, ?string $status, ?string $site): array
    {
        $conditions = [];
        $types = '';
        $params = [];

        $search = trim($search);
        if ($search !== '') {
            $like = '%' . $search . '%';
            $conditions[] = "(sc.titulo_email LIKE ?
                OR sc.site LIKE ?
                OR sc.numero_sc LIKE ?
                OR sc.numero_pc LIKE ?
                OR sc.numero_pv LIKE ?
                OR sc.equipamento_texto LIKE ?
                OR e.equipamento LIKE ?)";
            $types .= 'sssssss';
            array_push($params, $like, $like, $like, $like, $like, $like, $like);
        }

        $status = $status !== null ? trim($status) : '';
        if ($status !== '') {
            $conditions[] = "sc.status = ?";
            $types .= 's';
            $params[] = $status;
        }

        $site = $site !== null ? trim($site) : '';
        if ($site !== '') {
            $conditions[] = "sc.site LIKE ?";
            $types .= 's';
            $params[] = '%' . $site . '%';
        }

        $where = $conditions === [] ? '' : ' WHERE ' . implode(' AND ', $conditions);

        return [$where, $types, $params];
    }

    private function normalizeValue(string $field, mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        $type = self::WRITABLE_FIELDS[$field];

        if ($type === 'i') {
            return (int) $value;
        }

        if ($type === 'd') {
            return (float) $value;
        }

        return $value;
    }

    private function fetchAll(\mysqli_result $result): array
    {
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
    }
}
