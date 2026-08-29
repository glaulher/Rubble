<?php

namespace App\Api\Repositories;

class PreventivaDashboardRepository extends BaseRepository
{
    public function listForDashboard(?string $dateFrom, ?string $dateTo, ?string $status, string $search = ''): array
    {
        $pWhere = '1=1';
        $rWhere = '1=1';
        $pTypes = '';
        $rTypes = '';
        $pParams = [];
        $rParams = [];

        if ($dateFrom !== null && $dateFrom !== '') {
            $pWhere .= ' AND ap.data_planejada >= ?';
            $pTypes .= 's';
            $pParams[] = $dateFrom;

            $rWhere .= ' AND pd.data_planejada >= ?';
            $rTypes .= 's';
            $rParams[] = $dateFrom;
        }
        if ($dateTo !== null && $dateTo !== '') {
            $pWhere .= ' AND ap.data_planejada <= ?';
            $pTypes .= 's';
            $pParams[] = $dateTo;

            $rWhere .= ' AND pd.data_planejada <= ?';
            $rTypes .= 's';
            $rParams[] = $dateTo;
        }
        if ($status !== null && $status !== '') {
            $statusLower = mb_strtolower($status, 'UTF-8');
            $pWhere .= ' AND LOWER(ap.status) = ?';
            $pTypes .= 's';
            $pParams[] = $statusLower;

            $rWhere .= ' AND LOWER(r.status) = ?';
            $rTypes .= 's';
            $rParams[] = $statusLower;
        }
        if ($search !== '') {
            $like = '%' . $search . '%';
            $pWhere .= ' AND (ap.site LIKE ? OR ap.ticket LIKE ? OR ap.equipe LIKE ?)';
            $pTypes .= 'sss';
            $pParams[] = $like;
            $pParams[] = $like;
            $pParams[] = $like;

            $rWhere .= ' AND (e.local LIKE ? OR r.os LIKE ? OR r.equipe LIKE ?)';
            $rTypes .= 'sss';
            $rParams[] = $like;
            $rParams[] = $like;
            $rParams[] = $like;
        }

        $allTypes = $pTypes . $rTypes;
        $allParams = array_merge($pParams, $rParams);

        $sql = "
            SELECT id, site, ticket, data_planejada, equipe, status, qtd_executada, obs, machine_count
            FROM (
                SELECT ap.id, ap.site, ap.ticket, ap.data_planejada, ap.equipe, ap.status, ap.qtd_executada, ap.obs,
                       (SELECT COUNT(*) FROM equipamentos e WHERE e.local = ap.site) AS machine_count
                FROM atividades_preventivas ap
                WHERE {$pWhere}

                UNION ALL

                SELECT r.id, COALESCE(e.local, '') AS site, r.os AS ticket, pd.data_planejada, r.equipe, r.status,
                       NULL AS qtd_executada, r.obs,
                       (SELECT COUNT(*) FROM equipamentos eq WHERE eq.local = e.local) AS machine_count
                FROM registros r
                JOIN planejamento_datas pd ON pd.registro_id = r.id
                LEFT JOIN equipamentos e ON e.id = r.equipamento_id
                WHERE LOWER(r.tipo) = 'preventiva' AND {$rWhere}
            ) AS combined
            ORDER BY data_planejada DESC, id DESC
        ";

        $stmt = $this->safePrepare($sql);
        if ($allTypes !== '') {
            $stmt->bind_param($allTypes, ...$allParams);
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
