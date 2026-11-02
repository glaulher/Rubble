<?php

namespace App\Api\Repositories;

class EstoqueMaterialRepository extends BaseRepository
{
    private const SELECT_BASE = "SELECT em.*,
               COALESCE(s.quantidade_baixada, 0) AS quantidade_baixada,
               ROUND(em.quantidade - COALESCE(s.quantidade_baixada, 0), 2) AS quantidade_disponivel,
               COALESCE(s.total_saidas, 0) AS total_saidas
        FROM estoque_materiais em
        LEFT JOIN (
            SELECT 
                estoque_material_id,
                SUM(quantidade_saida) AS quantidade_baixada,
                COUNT(*) AS total_saidas
            FROM estoque_saidas
            GROUP BY estoque_material_id
        ) s ON s.estoque_material_id = em.id";

    private const WRITABLE_FIELDS = [
        'status' => 's',
        'material_descricao' => 's',
        'quantidade' => 'd',
        'unidade' => 's',
        'preco_compra' => 'd',
        'data_entrada' => 's',
        'fornecedor_nf' => 's',
        'site' => 's',
        'observacoes' => 's',
    ];

    public function listAll(
        int $limit = 50,
        int $offset = 0,
        string $search = '',
        ?string $status = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $allowedSort = [
            'id' => 'em.id',
            'data_entrada' => 'em.data_entrada',
            'material_descricao' => 'em.material_descricao',
            'status' => 'em.status',
            'site' => 'em.site',
            'quantidade' => 'em.quantidade',
            'preco_compra' => 'em.preco_compra',
            'quantidade_disponivel' => 'quantidade_disponivel',
        ];

        $column = $allowedSort[$sortBy] ?? 'em.id';
        $direction = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $sql = self::SELECT_BASE . $where . " ORDER BY {$column} {$direction} LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return $this->fetchAll($stmt->get_result());
    }

    public function count(string $search = '', ?string $status = null): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $sql = "SELECT COUNT(*) AS total FROM estoque_materiais em" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    public function getTotals(string $search = '', ?string $status = null): array
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $sql = "SELECT 
                    COUNT(*) AS total_lotes,
                    COALESCE(SUM(em.quantidade), 0) AS total_itens_entrada,
                    COALESCE(SUM(em.quantidade * em.preco_compra), 0) AS total_compra,
                    COALESCE(SUM(s.quantidade_baixada), 0) AS total_itens_baixados,
                    COALESCE(SUM(ROUND(em.quantidade - COALESCE(s.quantidade_baixada, 0), 2)), 0) AS total_itens_disponiveis
                FROM estoque_materiais em
                LEFT JOIN (
                    SELECT estoque_material_id, SUM(quantidade_saida) AS quantidade_baixada
                    FROM estoque_saidas
                    GROUP BY estoque_material_id
                ) s ON s.estoque_material_id = em.id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        $totalLotes = (int) ($row['total_lotes'] ?? 0);
        $totalEntrada = round((float) ($row['total_itens_entrada'] ?? 0), 2);
        $totalCompra = round((float) ($row['total_compra'] ?? 0), 2);
        $totalBaixados = round((float) ($row['total_itens_baixados'] ?? 0), 2);
        $totalDisponiveis = round((float) ($row['total_itens_disponiveis'] ?? 0), 2);

        return [
            'total_lotes' => $totalLotes,
            'total_itens_entrada' => $totalEntrada,
            'total_compra' => $totalCompra,
            'total_itens_baixados' => $totalBaixados,
            'total_itens_disponiveis' => $totalDisponiveis,
        ];
    }

    public function getById(int $id): ?array
    {
        $sql = self::SELECT_BASE . " WHERE em.id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return $row ?: null;
    }

    public function save(array $data): int
    {
        $fields = [];
        $placeholders = [];
        $types = '';
        $values = [];

        foreach (self::WRITABLE_FIELDS as $field => $type) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $fields[] = "`{$field}`";
            $placeholders[] = '?';
            $types .= $type;
            $values[] = $this->normalizeValue($field, $data[$field]);
        }

        if (empty($fields)) {
            return 0;
        }

        $sql = "INSERT INTO estoque_materiais (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$values);
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function update(int $id, array $data): bool
    {
        $sets = [];
        $types = '';
        $values = [];

        foreach (self::WRITABLE_FIELDS as $field => $type) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $sets[] = "`{$field}` = ?";
            $types .= $type;
            $values[] = $this->normalizeValue($field, $data[$field]);
        }

        if (empty($sets)) {
            return false;
        }

        $sql = "UPDATE estoque_materiais SET " . implode(', ', $sets) . " WHERE id = ?";
        $types .= 'i';
        $values[] = $id;

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$values);

        return $stmt->execute();
    }

    public function updateField(int $id, string $field, mixed $value): bool
    {
        if (!isset(self::WRITABLE_FIELDS[$field])) {
            return false;
        }

        $type = self::WRITABLE_FIELDS[$field];
        $val = $this->normalizeValue($field, $value);

        $sql = "UPDATE estoque_materiais SET `{$field}` = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $types = $type . 'i';
        $stmt->bind_param($types, $val, $id);

        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM estoque_materiais WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    public function statusCounts(): array
    {
        $sql = "SELECT status, COUNT(*) AS total FROM estoque_materiais GROUP BY status";
        $stmt = $this->safePrepare($sql);
        $stmt->execute();

        $counts = [];
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $counts[(string) $row['status']] = (int) $row['total'];
        }

        return $counts;
    }

    public function syncStatus(int $materialId): void
    {
        $item = $this->getById($materialId);
        if (!$item) {
            return;
        }

        $disponivel = (float) ($item['quantidade_disponivel'] ?? 0);
        $currentStatus = (string) ($item['status'] ?? '');

        // Não altera status reservados ou aguardando chegada automaticamente
        if ($currentStatus === 'reservado' || $currentStatus === 'aguardando_chegada') {
            return;
        }

        if ($disponivel <= 0 && $currentStatus !== 'aplicado') {
            $this->updateField($materialId, 'status', 'aplicado');
        } elseif ($disponivel > 0 && $currentStatus === 'aplicado') {
            $this->updateField($materialId, 'status', 'em_estoque');
        }
    }

    /**
     * @return array{0: string, 1: string, 2: array}
     */
    private function buildFilterClause(string $search, ?string $status): array
    {
        $conditions = [];
        $types = '';
        $params = [];

        $search = trim($search);
        if ($search !== '') {
            $like = '%' . $search . '%';
            $conditions[] = "(em.material_descricao LIKE ?
                OR em.site LIKE ?
                OR em.fornecedor_nf LIKE ?
                OR em.observacoes LIKE ?)";
            $types .= 'ssss';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        if ($status !== null && $status !== '' && $status !== 'todos') {
            $conditions[] = "em.status = ?";
            $types .= 's';
            $params[] = $status;
        }

        $where = !empty($conditions) ? ' WHERE ' . implode(' AND ', $conditions) : '';

        return [$where, $types, $params];
    }

    private function fetchAll(\mysqli_result $result): array
    {
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
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
}
