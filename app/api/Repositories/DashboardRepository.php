<?php

namespace App\Api\Repositories;

use RuntimeException;

class DashboardRepository extends BaseRepository
{

    private function queryOrFail(string $sql): \mysqli_result
    {
        $result = $this->conn->query($sql);
        if (!$result) {
            error_log('DashboardRepository query error: ' . $this->conn->error);
            throw new RuntimeException(
                'Erro interno na consulta'
            );
        }
        return $result;
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

    public function topSites(): array
    {
        $result = $this->queryOrFail("
            SELECT e.local, COUNT(*) as problemas
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
            WHERE LOWER(r.status) IN ('pendente', 'planejado', 'projeto clean up')
            GROUP BY e.local
            ORDER BY problemas DESC
            LIMIT 10
        ");

        return $result->fetch_all(MYSQLI_ASSOC);
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
