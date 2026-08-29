<?php

namespace App\Api\Repositories;

class PreventivaDashboardRepository extends BaseRepository
{
    public function listForDashboard(?string $dateFrom, ?string $dateTo, ?string $status, string $search = ''): array
    {
        $where = '1=1';
        $types = '';
        $params = [];

        if ($dateFrom !== null && $dateFrom !== '') {
            $where .= ' AND ap.data_planejada >= ?';
            $types .= 's';
            $params[] = $dateFrom;
        }
        if ($dateTo !== null && $dateTo !== '') {
            $where .= ' AND ap.data_planejada <= ?';
            $types .= 's';
            $params[] = $dateTo;
        }
        if ($status !== null && $status !== '') {
            $where .= ' AND LOWER(ap.status) = ?';
            $types .= 's';
            $params[] = mb_strtolower($status, 'UTF-8');
        }
        if ($search !== '') {
            $like = '%' . $search . '%';
            $where .= ' AND (ap.site LIKE ? OR ap.ticket LIKE ? OR ap.equipe LIKE ?)';
            $types .= 'sss';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql = "
            SELECT ap.*, (SELECT COUNT(*) FROM equipamentos e WHERE e.local = ap.site) AS machine_count
            FROM atividades_preventivas ap
            WHERE {$where}
            ORDER BY ap.data_planejada DESC, ap.id DESC
        ";

        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $stmt->close();
        return $rows;
    }
}
