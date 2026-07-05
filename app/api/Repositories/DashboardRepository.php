<?php

namespace App\Api\Repositories;

use RuntimeException;

class DashboardRepository extends BaseRepository
{

    private function queryOrFail(string $sql): \mysqli_result
    {
        $stmt = $this->safePrepare($sql);
        $stmt->execute();
        return $stmt->get_result();
    }

    public function statusCounts(): array
    {
        $result = $this->queryOrFail("
            SELECT LOWER(status) as status, COUNT(*) as total
            FROM registros
            WHERE status IS NOT NULL AND status != ''
            GROUP BY LOWER(status)
        ");

        $counts = [];
        while ($row = $result->fetch_assoc()) {
            $counts[$row['status']] = (int) $row['total'];
        }

        return $counts;
    }

    public function topSites(?array $activeStatuses = null): array
    {
        $statuses = $activeStatuses ?? ['pendente', 'planejado', 'projeto clean up'];
        $placeholders = implode(',', array_fill(0, count($statuses), '?'));
        $types = str_repeat('s', count($statuses));

        $sql = "
            SELECT e.local, COUNT(*) as problemas
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
            WHERE LOWER(r.status) IN ({$placeholders})
            GROUP BY e.local
            ORDER BY problemas DESC
            LIMIT 10
        ";

        $stmt = $this->safePrepare($sql);
        if (!empty($types)) {
            $stmt->bind_param($types, ...$statuses);
        }
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function topMachines(): array
    {
        $result = $this->queryOrFail("
            SELECT e.equipamento, e.local, e.localidade, COUNT(*) as total_registros
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
            GROUP BY e.id, e.equipamento, e.local, e.localidade
            ORDER BY total_registros DESC
            LIMIT 10
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function topTechnicians(): array
    {
        $result = $this->queryOrFail("
            SELECT equipe, COUNT(*) as atendimentos
            FROM registros
            WHERE equipe IS NOT NULL AND equipe != ''
            GROUP BY equipe
            ORDER BY atendimentos DESC
            LIMIT 10
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function avgResolutionByMachine(): array
    {
        $result = $this->queryOrFail("
            SELECT e.equipamento, e.local, AVG(DATEDIFF(r.data_concluido, r.data)) as dias_medio
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
            WHERE r.data_concluido IS NOT NULL
            GROUP BY e.id, e.equipamento, e.local
            HAVING dias_medio > 0
            ORDER BY dias_medio DESC
            LIMIT 10
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function avgResolutionByMonth(): array
    {
        $result = $this->queryOrFail("
            SELECT DATE_FORMAT(r.data, '%Y-%m') as mes, AVG(DATEDIFF(r.data_concluido, r.data)) as dias_medio
            FROM registros r
            WHERE r.data_concluido IS NOT NULL
            GROUP BY DATE_FORMAT(r.data, '%Y-%m')
            HAVING dias_medio >= 0
            ORDER BY mes ASC
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function avgResolutionByTechnician(): array
    {
        $result = $this->queryOrFail("
            SELECT equipe, AVG(DATEDIFF(data_concluido, data)) as dias_medio
            FROM registros
            WHERE data_concluido IS NOT NULL AND equipe IS NOT NULL AND equipe != ''
            GROUP BY equipe
            HAVING dias_medio >= 0
            ORDER BY dias_medio DESC
            LIMIT 10
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
    }
}
