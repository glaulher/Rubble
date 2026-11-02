<?php

namespace App\Api\Repositories;

class EstoqueSaidaRepository extends BaseRepository
{
    private const SELECT_BASE = "SELECT 
               es.*,
               em.material_descricao,
               em.unidade,
               em.preco_compra,
               em.data_entrada,
               em.fornecedor_nf,
               e.equipamento,
               e.capacidade,
               e.local,
               e.localidade,
               pi.descricao AS pv_item_descricao,
               pi.valor AS pv_item_valor
        FROM estoque_saidas es
        JOIN estoque_materiais em ON em.id = es.estoque_material_id
        LEFT JOIN equipamentos e ON e.id = es.equipamento_id
        LEFT JOIN pv_item pi ON pi.id = es.pv_item_id";

    private const WRITABLE_FIELDS = [
        'estoque_material_id' => 'i',
        'quantidade_saida' => 'd',
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
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        [$where, $types, $params] = $this->buildFilterClause($search, $materialId, $site, $comPv);

        $allowedSort = [
            'id' => 'es.id',
            'data_saida' => 'es.data_saida',
            'material_descricao' => 'em.material_descricao',
            'site' => 'es.site',
            'numero_pv' => 'es.numero_pv',
            'quantidade_saida' => 'es.quantidade_saida',
            'preco_venda' => 'es.preco_venda',
            'tecnico_nome' => 'es.tecnico_nome',
            'numero_os' => 'es.numero_os',
        ];

        $column = $allowedSort[$sortBy] ?? 'es.id';
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

    public function count(
        string $search = '',
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null
    ): int {
        [$where, $types, $params] = $this->buildFilterClause($search, $materialId, $site, $comPv);

        $sql = "SELECT COUNT(*) AS total
                FROM estoque_saidas es
                JOIN estoque_materiais em ON em.id = es.estoque_material_id
                LEFT JOIN equipamentos e ON e.id = es.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    public function getTotals(
        string $search = '',
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null
    ): array {
        [$where, $types, $params] = $this->buildFilterClause($search, $materialId, $site, $comPv);

        $sql = "SELECT 
                    COUNT(*) AS total_saidas,
                    COALESCE(SUM(es.quantidade_saida), 0) AS total_itens_baixados,
                    COALESCE(SUM(es.quantidade_saida * em.preco_compra), 0) AS total_custo,
                    COALESCE(SUM(CASE WHEN es.preco_venda IS NOT NULL THEN es.quantidade_saida * es.preco_venda ELSE 0 END), 0) AS total_venda
                FROM estoque_saidas es
                JOIN estoque_materiais em ON em.id = es.estoque_material_id
                LEFT JOIN equipamentos e ON e.id = es.equipamento_id" . $where;

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        $totalSaidas = (int) ($row['total_saidas'] ?? 0);
        $totalItens = round((float) ($row['total_itens_baixados'] ?? 0), 2);
        $totalCusto = round((float) ($row['total_custo'] ?? 0), 2);
        $totalVenda = round((float) ($row['total_venda'] ?? 0), 2);
        $lucroBruto = round($totalVenda - $totalCusto, 2);
        $margemMedia = $totalVenda > 0 ? round((($totalVenda - $totalCusto) / $totalVenda) * 100, 2) : null;

        return [
            'total_saidas' => $totalSaidas,
            'total_itens_baixados' => $totalItens,
            'total_custo' => $totalCusto,
            'total_venda' => $totalVenda,
            'lucro_bruto' => $lucroBruto,
            'margem_media' => $margemMedia,
        ];
    }

    public function getById(int $id): ?array
    {
        $sql = self::SELECT_BASE . " WHERE es.id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return $row ?: null;
    }

    public function getByMaterialId(int $materialId): array
    {
        $sql = self::SELECT_BASE . " WHERE es.estoque_material_id = ? ORDER BY es.data_saida DESC, es.id DESC";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $materialId);
        $stmt->execute();

        return $this->fetchAll($stmt->get_result());
    }

    public function sumSaidasByMaterialId(int $materialId, ?int $excludeSaidaId = null): float
    {
        $sql = "SELECT COALESCE(SUM(quantidade_saida), 0) AS total FROM estoque_saidas WHERE estoque_material_id = ?";
        $types = 'i';
        $params = [$materialId];

        if ($excludeSaidaId !== null && $excludeSaidaId > 0) {
            $sql .= " AND id != ?";
            $types .= 'i';
            $params[] = $excludeSaidaId;
        }

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return (float) ($row['total'] ?? 0);
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

        $sql = "INSERT INTO estoque_saidas (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
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

        $sql = "UPDATE estoque_saidas SET " . implode(', ', $sets) . " WHERE id = ?";
        $types .= 'i';
        $values[] = $id;

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$values);

        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM estoque_saidas WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    /**
     * @return array{0: string, 1: string, 2: array}
     */
    private function buildFilterClause(
        string $search,
        ?int $materialId,
        ?string $site,
        ?string $comPv
    ): array {
        $conditions = [];
        $types = '';
        $params = [];

        $search = trim($search);
        if ($search !== '') {
            $like = '%' . $search . '%';
            $conditions[] = "(em.material_descricao LIKE ?
                OR es.site LIKE ?
                OR es.tecnico_nome LIKE ?
                OR es.numero_os LIKE ?
                OR es.numero_pv LIKE ?
                OR em.fornecedor_nf LIKE ?
                OR e.equipamento LIKE ?
                OR es.equipamento_texto LIKE ?)";
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

        if ($materialId !== null && $materialId > 0) {
            $conditions[] = "es.estoque_material_id = ?";
            $types .= 'i';
            $params[] = $materialId;
        }

        if ($site !== null && trim($site) !== '') {
            $conditions[] = "es.site = ?";
            $types .= 's';
            $params[] = trim($site);
        }

        if ($comPv === 'com_pv') {
            $conditions[] = "(es.numero_pv IS NOT NULL AND es.numero_pv != '')";
        } elseif ($comPv === 'sem_pv') {
            $conditions[] = "(es.numero_pv IS NULL OR es.numero_pv = '')";
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
