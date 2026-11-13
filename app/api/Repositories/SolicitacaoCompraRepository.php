<?php

namespace App\Api\Repositories;

class SolicitacaoCompraRepository extends BaseRepository
{
    public const IMAGE_DIR = __DIR__ . '/../../../IMAGE';

    private static bool $schemaEnsured = false;
    private static bool $hasNumeroOs = false;
    private static bool $hasNumeroSm = false;

    public function __construct()
    {
        parent::__construct();
        $this->ensureColumns();
    }

    private function ensureColumns(): void
    {
        if (self::$schemaEnsured) {
            return;
        }

        try {
            $resSm = $this->conn->query("SHOW COLUMNS FROM `solicitacao_compra` LIKE 'numero_sm'");
            if ($resSm && $resSm->num_rows === 0) {
                $this->conn->query("ALTER TABLE `solicitacao_compra` ADD COLUMN `numero_sm` VARCHAR(50) DEFAULT NULL AFTER `id`, ADD UNIQUE KEY `uk_solicitacao_compra_sm` (`numero_sm`)");
                self::$hasNumeroSm = true;
            } else {
                self::$hasNumeroSm = (bool) ($resSm && $resSm->num_rows > 0);
            }

            $resOs = $this->conn->query("SHOW COLUMNS FROM `solicitacao_compra` LIKE 'numero_os'");
            if ($resOs && $resOs->num_rows === 0) {
                $this->conn->query("ALTER TABLE `solicitacao_compra` ADD COLUMN `numero_os` VARCHAR(50) DEFAULT NULL AFTER `numero_sc`, ADD KEY `idx_solicitacao_compra_numero_os` (`numero_os`)");
                self::$hasNumeroOs = true;
            } else {
                self::$hasNumeroOs = (bool) ($resOs && $resOs->num_rows > 0);
            }

            self::$schemaEnsured = true;
        } catch (\Throwable $e) {
            error_log("SolicitacaoCompraRepository ensureColumns aviso: " . $e->getMessage());
        }
    }

    private function getSelectBase(): string
    {
        $osExpr = self::$hasNumeroOs
            ? "COALESCE(NULLIF(TRIM(sc.numero_os), ''), pvos.pv_os) AS os"
            : "pvos.pv_os AS os";

        return "SELECT sc.*, e.equipamento, e.capacidade, e.local, e.localidade,
                   pvt.pv_valor_total,
                   pvos.pv_os,
                   {$osExpr},
                   sc_totais.pv_sc_total_valor,
                   sc_totais.pv_sc_count
            FROM solicitacao_compra sc
            LEFT JOIN equipamentos e ON e.id = sc.equipamento_id
            LEFT JOIN (SELECT p.numero_pv, SUM(pi.valor_total) AS pv_valor_total
                       FROM pv p JOIN pv_item pi ON pi.pv_id = p.id
                       GROUP BY p.numero_pv) pvt ON pvt.numero_pv = sc.numero_pv
            LEFT JOIN (SELECT p.numero_pv, GROUP_CONCAT(DISTINCT r.os ORDER BY r.os SEPARATOR ', ') AS pv_os
                       FROM pv p
                       JOIN pv_os po ON po.pv_id = p.id
                       JOIN registros r ON r.id = po.registro_id
                       GROUP BY p.numero_pv) pvos ON pvos.numero_pv = sc.numero_pv
            LEFT JOIN (SELECT sc_sub.numero_pv,
                              SUM(sc_sub.valor_sc) AS pv_sc_total_valor,
                              COUNT(*) AS pv_sc_count
                       FROM solicitacao_compra sc_sub
                       WHERE sc_sub.numero_pv IS NOT NULL AND TRIM(sc_sub.numero_pv) != ''
                       GROUP BY sc_sub.numero_pv) sc_totais ON sc_totais.numero_pv = sc.numero_pv";
    }

    private function getWritableFields(): array
    {
        $fields = [
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

        if (self::$hasNumeroSm) {
            $fields = ['numero_sm' => 's'] + $fields;
        }

        if (self::$hasNumeroOs) {
            $fields['numero_os'] = 's';
        }

        return $fields;
    }

    public function listAll(int $limit, int $offset, string $search = '', ?string $status = null, ?string $site = null): array
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $site);

        $sql = $this->getSelectBase() . $where . " ORDER BY sc.id DESC LIMIT ? OFFSET ?";

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

    public function totalValor(string $search = '', ?string $status = null, ?string $site = null): float
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $site);

        $sql = "SELECT COALESCE(SUM(sc.valor_sc), 0) AS total_valor
                FROM solicitacao_compra sc
                LEFT JOIN equipamentos e ON e.id = sc.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return (float) ($row['total_valor'] ?? 0.0);
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
        $sql = $this->getSelectBase() . " WHERE sc.id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();

        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
    }

    public function listWithSla(): array
    {
        $sql = $this->getSelectBase() . " WHERE sc.sla_dias IS NOT NULL ORDER BY sc.id";
        $stmt = $this->safePrepare($sql);
        $stmt->execute();

        return $this->fetchAll($stmt->get_result());
    }

    public function save(array $data): int
    {
        $writable = $this->getWritableFields();
        $fields = array_keys($writable);
        $types = '';
        $params = [];

        foreach ($writable as $field => $type) {
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
        $writable = $this->getWritableFields();
        $assignments = [];
        $types = '';
        $params = [];

        foreach ($writable as $field => $type) {
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
            $fields = [
                'sc.titulo_email',
                'sc.site',
                'sc.numero_sc',
                'sc.numero_pc',
                'sc.numero_pv',
                'sc.equipamento_texto',
                'e.equipamento',
            ];
            if (self::$hasNumeroSm) {
                array_unshift($fields, 'sc.numero_sm');
            }
            if (self::$hasNumeroOs) {
                $fields[] = 'sc.numero_os';
            }
            $conditions[] = '(' . implode(' LIKE ? OR ', $fields) . ' LIKE ?)';
            $types .= str_repeat('s', count($fields));
            for ($i = 0; $i < count($fields); $i++) {
                $params[] = $like;
            }
        }

        $status = $status !== null ? trim($status) : '';
        if ($status !== '') {
            $conditions[] = "sc.status = ?";
            $types .= 's';
            $params[] = $status;
        }

        $site = $site !== null ? trim($site) : '';
        if ($site !== '') {
            // O filtro do frontend é multi-select e chega como "A,B".
            $sites = array_values(array_filter(
                array_map('trim', explode(',', $site)),
                static fn (string $value): bool => $value !== ''
            ));

            if (count($sites) === 1) {
                $conditions[] = "sc.site LIKE ?";
                $types .= 's';
                $params[] = '%' . $sites[0] . '%';
            } elseif ($sites !== []) {
                $placeholders = implode(', ', array_fill(0, count($sites), '?'));
                $conditions[] = "sc.site IN ({$placeholders})";
                $types .= str_repeat('s', count($sites));
                foreach ($sites as $value) {
                    $params[] = $value;
                }
            }
        }

        $where = $conditions === [] ? '' : ' WHERE ' . implode(' AND ', $conditions);

        return [$where, $types, $params];
    }

    private function normalizeValue(string $field, mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        $writable = $this->getWritableFields();
        $type = $writable[$field] ?? 's';

        if ($type === 'i') {
            return (int) $value;
        }

        if ($type === 'd') {
            return (float) $value;
        }

        return $value;
    }

    public function getMaxNumberSm(string $yearPrefix): ?string
    {
        if (!self::$hasNumeroSm) {
            return null;
        }

        $sql = "SELECT MAX(numero_sm) AS max_num
                FROM solicitacao_compra
                WHERE numero_sm LIKE ?";
        $stmt = $this->safePrepare($sql);
        $param = "{$yearPrefix}%";
        $stmt->bind_param('s', $param);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return $row['max_num'] ?? null;
    }

    public function getByNumberSm(string $numeroSm): ?array
    {
        if (!self::$hasNumeroSm) {
            return null;
        }

        $sql = $this->getSelectBase() . " WHERE sc.numero_sm = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $numeroSm);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
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
