<?php

namespace App\Api\Repositories;

class OsDashboardRepository extends BaseRepository
{
    public function listAllForDashboard(): array
    {
        $sql = "
            SELECT r.*, e.local, e.equipamento, e.localidade
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id
            WHERE LOWER(r.tipo) = 'corretiva'
              AND e.local != 'Fornecimento'
            ORDER BY r.id DESC
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();

        $records = [];
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }

        return $records;
    }
}
