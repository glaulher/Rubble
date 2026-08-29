<?php

namespace App\Api\Repositories;

class PreventivaRepository extends BaseRepository
{
    public function create(array $data, string $defaultStatus = 'Planejado'): int
    {
        $hasSla = !empty($data['sla_days']) && (int) $data['sla_days'] > 0;

        if ($hasSla) {
            $slaDays = (int) $data['sla_days'];
            $includeSat = !empty($data['sla_include_saturday']) ? 1 : 0;
            $includeSun = !empty($data['sla_include_sunday']) ? 1 : 0;
            $dayNumber = (int) ($data['sla_day_number'] ?? 1);
            $groupId = $data['sla_group_id'] ?? null;
            if ($groupId === null) {
                $sql = "
                    INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs,
                        sla_days, sla_include_saturday, sla_include_sunday, sla_day_number, sla_group_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                ";
                $stmt = $this->safePrepare($sql);
                $stmt->bind_param(
                    'ssssssiiii',
                    $data['site'],
                    $data['data_planejada'],
                    $data['ticket'],
                    $data['equipe'],
                    $defaultStatus,
                    $data['obs'],
                    $slaDays,
                    $includeSat,
                    $includeSun,
                    $dayNumber
                );
            } else {
                $sql = "
                    INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs,
                        sla_days, sla_include_saturday, sla_include_sunday, sla_day_number, sla_group_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt = $this->safePrepare($sql);
                $stmt->bind_param(
                    'ssssssiiiii',
                    $data['site'],
                    $data['data_planejada'],
                    $data['ticket'],
                    $data['equipe'],
                    $defaultStatus,
                    $data['obs'],
                    $slaDays,
                    $includeSat,
                    $includeSun,
                    $dayNumber,
                    $groupId
                );
            }
        } else {
            $sql = "
                INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param(
                'ssssss',
                $data['site'],
                $data['data_planejada'],
                $data['ticket'],
                $data['equipe'],
                $defaultStatus,
                $data['obs']
            );
        }
        $stmt->execute();
        return (int) $this->conn->insert_id;
    }

    public function createSlaCard(int $originalId, string $targetDate, int $slaDayNumber): int
    {
        $sql = "
            INSERT INTO atividades_preventivas (site, ticket, data_planejada, equipe, status, obs,
                sla_days, sla_include_saturday, sla_include_sunday, sla_day_number, sla_group_id)
            SELECT site, ticket, ?, equipe, 'Planejado', obs,
                   sla_days, sla_include_saturday, sla_include_sunday, ?, COALESCE(sla_group_id, id)
            FROM atividades_preventivas
            WHERE id = ?
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sii', $targetDate, $slaDayNumber, $originalId);
        $stmt->execute();
        return (int) $this->conn->insert_id;
    }

    public function setSlaGroupId(int $id, int $groupId): bool
    {
        $sql = "UPDATE atividades_preventivas SET sla_group_id = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ii', $groupId, $id);
        return $stmt->execute();
    }

    public function sumQtdForGroup(int $groupId, ?int $excludeId = null): int
    {
        if ($excludeId !== null) {
            $sql = "SELECT COALESCE(SUM(qtd_executada),0) AS total FROM atividades_preventivas WHERE sla_group_id = ? AND id != ? AND qtd_executada IS NOT NULL";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('ii', $groupId, $excludeId);
        } else {
            $sql = "SELECT COALESCE(SUM(qtd_executada),0) AS total FROM atividades_preventivas WHERE sla_group_id = ? AND qtd_executada IS NOT NULL";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('i', $groupId);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }

    public function getSlaGroupProgress(int $groupId): array
    {
        $sql = "SELECT id, site, sla_days, sla_day_number, qtd_executada, status FROM atividades_preventivas WHERE sla_group_id = ? OR id = ? ORDER BY sla_day_number ASC, data_planejada ASC";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ii', $groupId, $groupId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        return $rows;
    }

    public function getById(int $id): ?array
    {
        $sql = "SELECT * FROM atividades_preventivas WHERE id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc() ?: null;
    }

    public function getPreventivaItemById(int $id): ?array
    {
        $sql = "
            SELECT ap.id, ap.site AS local, '' AS equipamento, '' AS capacidade, '' AS local_scm, '' AS localidade,
                   ap.ticket AS os, ap.data_planejada, ap.equipe, ap.status, ap.qtd_executada, ap.obs, 'preventiva' AS tipo,
                   (SELECT COUNT(*) FROM equipamentos WHERE local = ap.site) AS machine_count,
                   ap.sort_order,
                   COALESCE((SELECT e.mercado FROM equipamentos e WHERE e.local = ap.site LIMIT 1), '') AS mercado,
                   ap.sla_days, ap.sla_include_saturday, ap.sla_include_sunday, ap.sla_day_number, ap.sla_group_id,
                   COALESCE((SELECT GROUP_CONCAT(se.justification SEPARATOR ' | ') FROM sla_extensions se WHERE se.preventiva_id = ap.id), '') AS sla_extensions
            FROM atividades_preventivas ap
            WHERE ap.id = ?
            LIMIT 1
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc() ?: null;
    }

    public function countMachinesForSite(string $site): int
    {
        $sql = "SELECT COUNT(*) AS cnt FROM equipamentos WHERE local = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $site);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['cnt'] ?? 0);
    }

    public function updateStatus(int $id, string $status, string $obs, ?string $dataPlanejada = null, ?int $qtdExecutada = null): bool
    {
        $fields = ['status = ?', 'obs = ?'];
        $types = 'ss';
        $params = [$status, $obs];

        if ($dataPlanejada !== null) {
            $fields[] = 'data_planejada = ?';
            $types .= 's';
            $params[] = $dataPlanejada;
        }

        if ($qtdExecutada === null) {
            $fields[] = 'qtd_executada = NULL';
        } else {
            $fields[] = 'qtd_executada = ?';
            $types .= 'i';
            $params[] = $qtdExecutada;
        }

        $types .= 'i';
        $params[] = $id;

        $sql = "UPDATE atividades_preventivas SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        return $stmt->execute();
    }

    public function updateQtd(int $id, int $qtd): bool
    {
        $sql = "UPDATE atividades_preventivas SET qtd_executada = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ii', $qtd, $id);
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM atividades_preventivas WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

}
