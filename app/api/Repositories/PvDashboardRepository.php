<?php

namespace App\Api\Repositories;

use RuntimeException;

class PvDashboardRepository extends BaseRepository
{
    private function executePreparedQuery(string $sql, array $params, string $types): \mysqli_result
    {
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Erro na preparação: ' . $this->conn->error);
        }
        if ($params) {
            $bindParams = [$types];
            foreach ($params as &$param) {
                $bindParams[] = &$param;
            }
            unset($param);
            call_user_func_array([$stmt, 'bind_param'], $bindParams);
        }
        if (!$stmt->execute()) {
            throw new RuntimeException('Erro na execução: ' . $stmt->error);
        }
        $result = $stmt->get_result();
        $stmt->close();
        return $result;
    }

    private function buildFilterParams(?string $periodStart, ?string $periodEnd, ?string $location): array
    {
        $conditions = [];
        $params = [];
        $types = '';

        if ($periodStart !== null && $periodStart !== '') {
            $conditions[] = 'pv.data >= ?';
            $params[] = $periodStart;
            $types .= 's';
        }
        if ($periodEnd !== null && $periodEnd !== '') {
            $conditions[] = 'pv.data <= ?';
            $params[] = $periodEnd;
            $types .= 's';
        }
        if ($location !== null && $location !== '') {
            $conditions[] = 'pv.local = ?';
            $params[] = $location;
            $types .= 's';
        }

        $clause = $conditions ? 'AND ' . implode(' AND ', $conditions) : '';
        return [$clause, $params, $types];
    }

    public function statusCounts(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT pv.status, COUNT(DISTINCT pv.id) as count, COALESCE(SUM(pi.valor_total), 0) as totalValue
            FROM pv
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            WHERE 1=1 {$filter}
            GROUP BY pv.status
            ORDER BY totalValue DESC
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function financialByMonth(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT DATE_FORMAT(pv.data, '%Y-%m') as mes,
                COALESCE(SUM(CASE WHEN pv.status = 'SCM aprovado' THEN pi.valor_total ELSE 0 END), 0) as faturado,
                COALESCE(SUM(CASE WHEN pv.status != 'SCM aprovado' AND pv.status != 'Cancelado' THEN pi.valor_total ELSE 0 END), 0) as previsao
            FROM pv
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            WHERE pv.data IS NOT NULL {$filter}
            GROUP BY DATE_FORMAT(pv.data, '%Y-%m')
            ORDER BY mes ASC
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function topLocations(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT pv.local, COALESCE(SUM(pi.valor_total), 0) as totalValue, COUNT(DISTINCT pv.id) as pvCount
            FROM pv
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            WHERE pv.status = 'SCM aprovado' {$filter}
            GROUP BY pv.local
            ORDER BY totalValue DESC
            LIMIT 10
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function topMaterials(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT pi.descricao_lpu, pi.descricao, COALESCE(SUM(pi.quantidade), 0) as quantidade, COALESCE(SUM(pi.valor_total), 0) as valorTotal
            FROM pv_item pi
            JOIN pv ON pv.id = pi.pv_id
            WHERE pi.lpu_origem IN ('lpu_material_clima', 'lpu_material_chiller') {$filter}
            GROUP BY pi.descricao_lpu, pi.descricao
            ORDER BY valorTotal DESC
            LIMIT 10
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function topServices(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT pi.descricao_lpu, pi.descricao, COALESCE(SUM(pi.quantidade), 0) as quantidade, COALESCE(SUM(pi.valor_total), 0) as valorTotal
            FROM pv_item pi
            JOIN pv ON pv.id = pi.pv_id
            WHERE pi.lpu_origem IN ('lpu_servico_clima', 'lpu_servico_chiller', 'lpu_civil') {$filter}
            GROUP BY pi.descricao_lpu, pi.descricao
            ORDER BY valorTotal DESC
            LIMIT 10
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function topEquipment(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT e.equipamento, e.local, COALESCE(SUM(pi.valor_total), 0) as totalValue
            FROM pv
            JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            WHERE 1=1 {$filter}
            GROUP BY e.id, e.equipamento, e.local
            ORDER BY totalValue DESC
            LIMIT 10
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function pvByMonth(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): array
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT DATE_FORMAT(pv.data, '%Y-%m') as mes, COUNT(*) as total
            FROM pv
            WHERE pv.data IS NOT NULL {$filter}
            GROUP BY DATE_FORMAT(pv.data, '%Y-%m')
            ORDER BY mes ASC
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function totalPvCount(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): int
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "SELECT COUNT(*) as total FROM pv WHERE 1=1 {$filter}";
        $result = $this->executePreparedQuery($sql, $params, $types);
        $row = $result->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }

    public function totalPvValue(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null): float
    {
        [$filter, $params, $types] = $this->buildFilterParams($periodStart, $periodEnd, $location);
        $sql = "
            SELECT COALESCE(SUM(pi.valor_total), 0) as total
            FROM pv
            JOIN pv_item pi ON pi.pv_id = pv.id
            WHERE 1=1 {$filter}
        ";
        $result = $this->executePreparedQuery($sql, $params, $types);
        $row = $result->fetch_assoc();
        return (float) ($row['total'] ?? 0);
    }

    public function listLocations(): array
    {
        $sql = "SELECT DISTINCT local FROM pv ORDER BY local";
        $result = $this->conn->query($sql);
        $locals = [];
        while ($row = $result->fetch_assoc()) {
            $locals[] = $row['local'];
        }
        return $locals;
    }
}
