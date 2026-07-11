<?php

namespace App\Api\Repositories;

use App\Api\Entities\Ticket;

class PlannedActivityRepository extends BaseRepository
{
    public function listAll(int $limit, int $offset, string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): array
    {
        [$pw, $pp, $pt] = $this->buildPreventivaFilter($search, $dateFrom, $dateTo, $status);
        [$cw, $cp, $ct] = $this->buildCorretivaFilter($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT id, local, equipamento, capacidade, local_scm, localidade, os, data_planejada, equipe, status, obs, tipo, machine_count, sort_order, mercado, sla_days, sla_include_saturday, sla_include_sunday, sla_day_number
            FROM (
                SELECT ap.id, ap.site AS local, '' AS equipamento, '' AS capacidade, '' AS local_scm, '' AS localidade,
                       ap.ticket AS os, ap.data_planejada, ap.equipe, ap.status, ap.obs, 'preventiva' AS tipo,
                       (SELECT COUNT(*) FROM equipamentos WHERE local = ap.site) AS machine_count,
                       ap.sort_order, '' AS mercado,
                       ap.sla_days, ap.sla_include_saturday, ap.sla_include_sunday, ap.sla_day_number
                FROM atividades_preventivas ap
                WHERE {$pw}

                UNION ALL

                SELECT r.id, COALESCE(e.local, ''), COALESCE(e.equipamento, ''), COALESCE(e.capacidade, ''),
                       COALESCE(e.local_scm, ''), COALESCE(e.localidade, ''),
                       r.os, pd.data_planejada, r.equipe, r.status, r.obs, r.tipo, 0 AS machine_count,
                       pd.sort_order, COALESCE(e.mercado, '') AS mercado,
                       r.sla_days, r.sla_include_saturday, r.sla_include_sunday, pd.sla_day_number
                FROM registros r
                JOIN planejamento_datas pd ON pd.registro_id = r.id
                LEFT JOIN equipamentos e ON e.id = r.equipamento_id
                WHERE {$cw}
            ) AS combined
            ORDER BY data_planejada DESC, sort_order ASC, id DESC
            LIMIT ? OFFSET ?
        ";

        $allParams = array_merge($pp, $cp, [$limit, $offset]);
        $allTypes = $pt . $ct . 'ii';

        $stmt = $this->safePrepare($sql);
        if ($allTypes !== '') {
            $stmt->bind_param($allTypes, ...$allParams);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }

        return $items;
    }

    public function count(string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): int
    {
        [$pw, $pp, $pt] = $this->buildPreventivaFilter($search, $dateFrom, $dateTo, $status);
        [$cw, $cp, $ct] = $this->buildCorretivaFilter($search, $dateFrom, $dateTo, $status);

        $sql = "
            SELECT COUNT(*) AS total
            FROM (
                SELECT ap.id FROM atividades_preventivas ap WHERE {$pw}
                UNION ALL
                SELECT pd.id FROM registros r
                JOIN planejamento_datas pd ON pd.registro_id = r.id
                LEFT JOIN equipamentos e ON e.id = r.equipamento_id
                WHERE {$cw}
            ) AS combined
        ";

        $allParams = array_merge($pp, $cp);
        $allTypes = $pt . $ct;

        $stmt = $this->safePrepare($sql);
        if ($allTypes !== '') {
            $stmt->bind_param($allTypes, ...$allParams);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return (int) ($row['total'] ?? 0);
    }

    private function buildCorretivaFilter(string $search, ?string $dateFrom, ?string $dateTo, ?string $status): array
    {
        $where = 'r.tipo = \'corretiva\'';
        $params = [];
        $types = '';

        if ($dateFrom !== null && $dateFrom !== '') {
            $where .= ' AND pd.data_planejada >= ?';
            $params[] = $dateFrom;
            $types .= 's';
        }
        if ($dateTo !== null && $dateTo !== '') {
            $where .= ' AND pd.data_planejada <= ?';
            $params[] = $dateTo;
            $types .= 's';
        }
        if ($status !== null && $status !== '') {
            $where .= ' AND LOWER(r.status) = ?';
            $params[] = mb_strtolower($status);
            $types .= 's';
        }

        $search = $this->normalizeDateSearch($search);
        if ($search !== '') {
            $searchTerm = '%' . $search . '%';
            if (mb_strlen($search) >= 3) {
                $safeSearch = $this->conn->real_escape_string($search);
                $where .= " AND (MATCH(e.local, e.equipamento, e.localidade) AGAINST('+{$safeSearch}*' IN BOOLEAN MODE) OR r.obs LIKE ? OR r.os LIKE ? OR pd.data_planejada LIKE ? OR r.tipo LIKE ?)";
                array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'ssss';
            } else {
                $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR r.obs LIKE ? OR r.os LIKE ? OR pd.data_planejada LIKE ? OR r.tipo LIKE ?)';
                array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
                $types .= 'sssssss';
            }
        }

        return [$where, $params, $types];
    }

    private function buildPreventivaFilter(string $search, ?string $dateFrom, ?string $dateTo, ?string $status): array
    {
        $where = 'ap.data_planejada IS NOT NULL';
        $params = [];
        $types = '';

        if ($dateFrom !== null && $dateFrom !== '') {
            $where .= ' AND ap.data_planejada >= ?';
            $params[] = $dateFrom;
            $types .= 's';
        }
        if ($dateTo !== null && $dateTo !== '') {
            $where .= ' AND ap.data_planejada <= ?';
            $params[] = $dateTo;
            $types .= 's';
        }
        if ($status !== null && $status !== '') {
            $where .= ' AND LOWER(ap.status) = ?';
            $params[] = mb_strtolower($status);
            $types .= 's';
        }

        $search = $this->normalizeDateSearch($search);
        if ($search !== '') {
            $searchTerm = '%' . $search . '%';
            $where .= ' AND (ap.site LIKE ? OR ap.ticket LIKE ? OR ap.obs LIKE ?)';
            array_push($params, $searchTerm, $searchTerm, $searchTerm);
            $types .= 'sss';
        }

        return [$where, $params, $types];
    }

    public function findByOsAndEquipment(string $os, int $equipamentoId): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE os = ? AND equipamento_id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $os, $equipamentoId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function createFromPlanning(array $data, string $auditLog): int
    {
        $tipo = $data['tipo'] ?? 'preventiva';
        $status = $data['status'] ?? 'Planejado';
        $origin = $data['origin'] ?? 'planning';
        $hasSla = !empty($data['sla_days']) && (int) $data['sla_days'] > 0;

        if ($hasSla) {
            $sql = "
                INSERT INTO registros (
                    equipamento_id, os, data, equipe, status, data_planejada, material, obs, origin, tipo,
                    sla_days, sla_include_saturday, sla_include_sunday
                ) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->safePrepare($sql);
            $slaDays = (int) $data['sla_days'];
            $includeSat = !empty($data['sla_include_saturday']) ? 1 : 0;
            $includeSun = !empty($data['sla_include_sunday']) ? 1 : 0;
            $stmt->bind_param(
                'issssssssiii',
                $data['equipamento_id'],
                $data['os'],
                $data['equipe'],
                $status,
                $data['data_planejada'],
                $data['material'],
                $auditLog,
                $origin,
                $tipo,
                $slaDays,
                $includeSat,
                $includeSun
            );
        } else {
            $sql = "
                INSERT INTO registros (
                    equipamento_id, os, data, equipe, status, data_planejada, material, obs, origin, tipo
                ) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param(
                'issssssss',
                $data['equipamento_id'],
                $data['os'],
                $data['equipe'],
                $status,
                $data['data_planejada'],
                $data['material'],
                $auditLog,
                $origin,
                $tipo
            );
        }
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function updateSlaFields(int $id, int $slaDays, int $includeSat, int $includeSun): void
    {
        $sql = "UPDATE registros SET sla_days = ?, sla_include_saturday = ?, sla_include_sunday = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('iiii', $slaDays, $includeSat, $includeSun, $id);
        $stmt->execute();
    }

    public function getLastPlannedDate(int $registroId): string
    {
        $sql = "SELECT data_planejada FROM planejamento_datas WHERE registro_id = ? ORDER BY sla_day_number DESC, data_planejada DESC LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $registroId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['data_planejada'] ?? date('Y-m-d');
    }

    public function updateToPlanned(int $id, string $dataPlanejada, string $equipe, string $auditLog, string $tipo = 'preventiva', string $status = 'Planejado'): bool
    {
        $sql = "
            UPDATE registros
            SET status = ?, data_planejada = ?, equipe = ?, obs = ?, tipo = ?,
                notificacao_enviada = 0
            WHERE id = ?
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'sssssi',
            $status,
            $dataPlanejada,
            $equipe,
            $auditLog,
            $tipo,
            $id
        );
        return $stmt->execute();
    }

    public function updatePlanningFields(int $id, string $equipe, string $auditLog, string $tipo, string $status): bool
    {
        $sql = "
            UPDATE registros
            SET status = ?, equipe = ?, obs = ?, tipo = ?, notificacao_enviada = 0
            WHERE id = ?
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ssssi', $status, $equipe, $auditLog, $tipo, $id);
        return $stmt->execute();
    }

    public function addPlannedDate(int $registroId, string $data, int $slaDayNumber = 0): bool
    {
        $sql = "INSERT IGNORE INTO planejamento_datas (registro_id, data_planejada, sla_day_number) VALUES (?, ?, ?)";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('isi', $registroId, $data, $slaDayNumber);
        return $stmt->execute();
    }

    public function createPreventivaSlaCard(int $originalId, string $targetDate, int $slaDayNumber): int
    {
        $sql = "
            INSERT INTO atividades_preventivas (site, ticket, data_planejada, equipe, status, obs, sla_days, sla_include_saturday, sla_include_sunday, sla_day_number)
            SELECT site, ticket, ?, equipe, 'Planejado', obs, sla_days, sla_include_saturday, sla_include_sunday, ?
            FROM atividades_preventivas
            WHERE id = ?
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sii', $targetDate, $slaDayNumber, $originalId);
        $stmt->execute();
        return (int) $this->conn->insert_id;
    }

    public function addSlaExtension(int $registroId, string $tipo, int $extraDays, string $justification): int
    {
        $idCol = $tipo === 'preventiva' ? 'preventiva_id' : 'registro_id';
        $sql = "INSERT INTO sla_extensions ({$idCol}, tipo, extra_days, justification) VALUES (?, ?, ?, ?)";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('isis', $registroId, $tipo, $extraDays, $justification);
        $stmt->execute();
        return (int) $this->conn->insert_id;
    }

    public function getSlaExtensionsTotal(int $parentId, string $tipo): int
    {
        $idCol = $tipo === 'preventiva' ? 'preventiva_id' : 'registro_id';
        $sql = "SELECT COALESCE(SUM(extra_days), 0) AS total FROM sla_extensions WHERE {$idCol} = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $parentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }

    public function getPreventivaById(int $id): ?array
    {
        $sql = "SELECT * FROM atividades_preventivas WHERE id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row ?: null;
    }

    public function updatePreventivaSlaFields(int $id, int $slaDays, int $includeSat, int $includeSun): void
    {
        $sql = "UPDATE atividades_preventivas SET sla_days = ?, sla_include_saturday = ?, sla_include_sunday = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('iiii', $slaDays, $includeSat, $includeSun, $id);
        $stmt->execute();
    }

    public function removePlannedDate(int $registroId, string $data): bool
    {
        $sql = "DELETE FROM planejamento_datas WHERE registro_id = ? AND data_planejada = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('is', $registroId, $data);
        return $stmt->execute();
    }

    public function countPlannedDates(int $registroId): int
    {
        $sql = "SELECT COUNT(*) AS total FROM planejamento_datas WHERE registro_id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $registroId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }

    public function removeAllPlannedDates(int $registroId): bool
    {
        $sql = "DELETE FROM planejamento_datas WHERE registro_id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $registroId);
        return $stmt->execute();
    }

    public function delete(int $id, string $origin = ''): bool
    {
        $sql = "DELETE FROM registros WHERE id = ?";
        $params = [$id];
        $types = 'i';

        if ($origin !== '') {
            $sql .= " AND origin = ?";
            $params[] = $origin;
            $types .= 's';
        }

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        return $stmt->execute();
    }

    public function unplan(int $id, string $unplanStatus = 'Pendente'): bool
    {
        $sql = "UPDATE registros SET status = ?, data_planejada = NULL WHERE id = ? AND data_planejada IS NOT NULL";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $unplanStatus, $id);
        return $stmt->execute();
    }

    public function getById(int $id): ?Ticket
    {
        $sql = "SELECT * FROM registros WHERE id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ? new Ticket($row) : null;
    }

    public function updateTeam(int $id, string $tipo, string $equipe): bool
    {
        $table = $tipo === 'preventiva' ? 'atividades_preventivas' : 'registros';
        $sql = "UPDATE {$table} SET equipe = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $equipe, $id);
        return $stmt->execute();
    }

    public function updateObs(int $id, string $tipo, string $obs): bool
    {
        $table = $tipo === 'preventiva' ? 'atividades_preventivas' : 'registros';
        $sql = "UPDATE {$table} SET obs = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $obs, $id);
        return $stmt->execute();
    }

    public function updateCorretivaStatus(int $id, string $status, ?string $dataConcluido = null): bool
    {
        if ($dataConcluido !== null && $status === 'Concluído') {
            $sql = "UPDATE registros SET status = ?, data_concluido = ? WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('ssi', $status, $dataConcluido, $id);
        } else {
            $sql = "UPDATE registros SET status = ? WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('si', $status, $id);
        }
        return $stmt->execute();
    }

    private function normalizeDateSearch(string $search): string
    {
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $search, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        return $search;
    }

    /*
    |--------------------------------------------------------------------------
    | DUPLICATE DAY
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | SORT ORDER (Drag-to-Reorder)
    |--------------------------------------------------------------------------
    */

    public function batchUpdateSortOrder(array $order, string $tipo, string $data): void
    {
        if (empty($order)) {
            return;
        }

        if ($tipo === 'preventiva') {
            $caseSql = '';
            $ids = [];
            foreach ($order as $position => $id) {
                $caseSql .= "WHEN ? THEN ? ";
                $ids[] = (int) $id;
                $ids[] = $position + 1;
            }
            $placeholders = implode(',', array_fill(0, count($order), '?'));
            $types = str_repeat('ii', count($order)) . str_repeat('i', count($order));
            $allParams = array_merge($ids, array_map('intval', $order));

            $sql = "UPDATE atividades_preventivas SET sort_order = CASE id {$caseSql} END WHERE id IN ({$placeholders})";
        } else {
            $caseSql = '';
            $ids = [];
            foreach ($order as $position => $id) {
                $caseSql .= "WHEN ? THEN ? ";
                $ids[] = (int) $id;
                $ids[] = $position + 1;
            }
            $types = str_repeat('ii', count($order)) . 's';
            $allParams = array_merge($ids, [$data]);

            $sql = "UPDATE planejamento_datas SET sort_order = CASE registro_id {$caseSql} END WHERE data_planejada = ?";
        }

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$allParams);
        $stmt->execute();
    }

    public function moveDate(int $id, string $tipo, string $sourceDate, string $targetDate): void
    {
        if ($tipo === 'preventiva') {
            $sql = "UPDATE atividades_preventivas SET data_planejada = ?, sort_order = 0 WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('si', $targetDate, $id);
        } else {
            // Insert into planejamento_datas (with sort_order=0 to go to bottom)
            $sql = "INSERT IGNORE INTO planejamento_datas (registro_id, data_planejada, sort_order) VALUES (?, ?, 0)";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('is', $id, $targetDate);
            $stmt->execute();

            // Remove from source date
            $sql = "DELETE FROM planejamento_datas WHERE registro_id = ? AND data_planejada = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('is', $id, $sourceDate);
        }
        $stmt->execute();
    }

    public function findByDate(string $date): array
    {
        $sql = "
            SELECT 'preventiva' AS tipo, id, site, ticket AS os, data_planejada, equipe, status, obs
            FROM atividades_preventivas
            WHERE data_planejada = ?
            UNION ALL
            SELECT DISTINCT 'corretiva' AS tipo, r.id, '' AS site, r.os, pd.data_planejada, r.equipe, r.status, r.obs
            FROM registros r
            JOIN planejamento_datas pd ON pd.registro_id = r.id
            WHERE pd.data_planejada = ? AND r.tipo = 'corretiva'
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ss', $date, $date);
        $stmt->execute();
        $result = $stmt->get_result();
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        return $items;
    }

    public function duplicatePreventivaToDate(int $id, string $targetDate, string $status): int
    {
        $sql = "
            INSERT INTO atividades_preventivas (site, ticket, data_planejada, equipe, status, obs)
            SELECT site, ticket, ?, equipe, ?, obs
            FROM atividades_preventivas
            WHERE id = ?
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ssi', $targetDate, $status, $id);
        $stmt->execute();
        return (int) $this->conn->insert_id;
    }

    public function duplicateCorretivaToDate(int $id, string $targetDate, string $status, string $origin): int
    {
        $this->addPlannedDate($id, $targetDate);
        return $id;
    }

    public function isDateFree(string $date, int $id, string $tipo): bool
    {
        if ($tipo === 'preventiva') {
            $sql = "SELECT COUNT(*) AS cnt FROM atividades_preventivas WHERE data_planejada = ? AND id = ?";
        } else {
            $sql = "SELECT COUNT(*) AS cnt FROM planejamento_datas WHERE data_planejada = ? AND registro_id = ?";
        }
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('si', $date, $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return ($row['cnt'] ?? 0) > 0;
    }

    public function getPlannedDateInfo(int $registroId, string $data): ?array
    {
        $sql = "SELECT sla_day_number FROM planejamento_datas WHERE registro_id = ? AND data_planejada = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('is', $registroId, $data);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row ?: null;
    }

    public function decrementCorretivaSlaDays(int $registroId): void
    {
        $sql = "UPDATE registros SET sla_days = GREATEST(COALESCE(sla_days, 0) - 1, 0) WHERE id = ? AND sla_days > 0";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $registroId);
        $stmt->execute();
    }

    public function decrementPreventivaSlaDays(int $id): void
    {
        $sql = "UPDATE atividades_preventivas SET sla_days = GREATEST(COALESCE(sla_days, 0) - 1, 0) WHERE id = ? AND sla_days > 0";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
    }

    public function setSlaFields(int $id, string $tipo, int $slaDays, int $includeSat, int $includeSun): void
    {
        $table = $tipo === 'preventiva' ? 'atividades_preventivas' : 'registros';
        if ($tipo === 'preventiva') {
            $sql = "UPDATE {$table} SET sla_days = ?, sla_include_saturday = ?, sla_include_sunday = ? WHERE id = ?";
        } else {
            $sql = "UPDATE {$table} SET sla_days = ?, sla_include_saturday = ?, sla_include_sunday = ? WHERE id = ?";
        }
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('iiii', $slaDays, $includeSat, $includeSun, $id);
        $stmt->execute();
    }

    public function getMaxSlaDayNumber(int $parentId, string $tipo): int
    {
        if ($tipo === 'preventiva') {
            $sql = "SELECT COALESCE(MAX(sla_day_number), 0) AS max FROM atividades_preventivas WHERE id = ?";
        } else {
            $sql = "SELECT COALESCE(MAX(sla_day_number), 0) AS max FROM planejamento_datas WHERE registro_id = ?";
        }
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $parentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['max'] ?? 0);
    }

    public function setCardDayNumber(int $parentId, string $data, string $tipo, int $dayNum): void
    {
        if ($tipo === 'preventiva') {
            $sql = "UPDATE atividades_preventivas SET sla_day_number = ? WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('ii', $dayNum, $parentId);
        } else {
            $sql = "UPDATE planejamento_datas SET sla_day_number = ? WHERE registro_id = ? AND data_planejada = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('iis', $dayNum, $parentId, $data);
        }
        $stmt->execute();
    }
}
