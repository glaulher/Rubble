<?php

namespace App\Api\Repositories;

class EstoqueMaterialRepository extends BaseRepository
{
    private const SELECT_BASE = "SELECT em.*,
               e.equipamento, e.capacidade, e.local, e.localidade,
               pi.descricao AS pv_item_descricao, pi.valor AS pv_item_valor
        FROM estoque_materiais em
        LEFT JOIN equipamentos e ON e.id = em.equipamento_id
        LEFT JOIN pv_item pi ON pi.id = em.pv_item_id";

    private const WRITABLE_FIELDS = [
        'status' => 's',
        'material_descricao' => 's',
        'quantidade' => 'd',
        'unidade' => 's',
        'preco_compra' => 'd',
        'data_entrada' => 's',
        'fornecedor_nf' => 's',
        'data_saida' => 's',
        'tecnico_nome' => 's',
        'numero_os' => 's',
        'site' => 's',
        'equipamento_id' => 'i',
        'equipamento_texto' => 's',
        'numero_pv' => 's',
        'pv_item_id' => 'i',
        'preco_venda' => 'd',
        'observacoes' => 's',
    ];

    public function listAll(
        int $limit = 50,
        int $offset = 0,
        string $search = '',
        ?string $status = null,
        ?string $comPv = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $comPv);

        $allowedSort = [
            'id' => 'em.id',
            'data_entrada' => 'em.data_entrada',
            'data_saida' => 'em.data_saida',
            'material_descricao' => 'em.material_descricao',
            'status' => 'em.status',
            'site' => 'em.site',
            'numero_pv' => 'em.numero_pv',
            'quantidade' => 'em.quantidade',
            'preco_compra' => 'em.preco_compra',
            'preco_venda' => 'em.preco_venda',
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

    public function count(string $search = '', ?string $status = null, ?string $comPv = null): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $comPv);

        $sql = "SELECT COUNT(*) AS total
                FROM estoque_materiais em
                LEFT JOIN equipamentos e ON e.id = em.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    public function getTotals(string $search = '', ?string $status = null, ?string $comPv = null): array
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $comPv);

        $sql = "SELECT 
                    COUNT(*) AS total_itens,
                    COALESCE(SUM(em.quantidade * em.preco_compra), 0) AS total_compra,
                    COALESCE(SUM(CASE WHEN em.preco_venda IS NOT NULL THEN em.quantidade * em.preco_venda ELSE 0 END), 0) AS total_venda
                FROM estoque_materiais em
                LEFT JOIN equipamentos e ON e.id = em.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        $totalItens = (int) ($row['total_itens'] ?? 0);
        $totalCompra = round((float) ($row['total_compra'] ?? 0), 2);
        $totalVenda = round((float) ($row['total_venda'] ?? 0), 2);
        $lucroBruto = round($totalVenda - $totalCompra, 2);
        $margemMedia = $totalVenda > 0 ? round((($totalVenda - $totalCompra) / $totalVenda) * 100, 2) : null;

        return [
            'total_itens' => $totalItens,
            'total_compra' => $totalCompra,
            'total_venda' => $totalVenda,
            'lucro_bruto' => $lucroBruto,
            'margem_media' => $margemMedia,
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

    /**
     * @return array{0: string, 1: string, 2: array}
     */
    private function buildFilterClause(string $search, ?string $status, ?string $comPv): array
    {
        $conditions = [];
        $types = '';
        $params = [];

        $search = trim($search);
        if ($search !== '') {
            $like = '%' . $search . '%';
            $conditions[] = "(em.material_descricao LIKE ?
                OR em.site LIKE ?
                OR em.tecnico_nome LIKE ?
                OR em.numero_os LIKE ?
                OR em.numero_pv LIKE ?
                OR em.fornecedor_nf LIKE ?
                OR e.equipamento LIKE ?
                OR em.equipamento_texto LIKE ?)";
            $types .= 'ssssssss';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
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

        if ($comPv === 'com_pv') {
            $conditions[] = "(em.numero_pv IS NOT NULL AND em.numero_pv != '')";
        } elseif ($comPv === 'sem_pv') {
            $conditions[] = "(em.numero_pv IS NULL OR em.numero_pv = '')";
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
