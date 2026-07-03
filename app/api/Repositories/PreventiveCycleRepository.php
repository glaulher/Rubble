<?php

namespace App\Api\Repositories;

class PreventiveCycleRepository extends BaseRepository
{
    public function listByCiclo(string $ciclo, int $limit, int $offset, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, string $valorCaseSql = '', string $excludedEquipment = '', string $excludedLocation = '', array $scmStatuses = []): array
    {
        $where = 'e.equipamento != ? AND e.local != ?';
        $whereParams = [$excludedEquipment, $excludedLocation];
        $whereTypes = 'ss';

        if ($search !== '') {
            $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR e.local_scm LIKE ?)';
            $likeSearch = '%' . $search . '%';
            $whereParams = array_merge($whereParams, [$likeSearch, $likeSearch, $likeSearch, $likeSearch]);
            $whereTypes .= 'ssss';
        }

        if ($checkedOnly) {
            $where .= ' AND pci.id IS NOT NULL';
        }

        if ($hasObservacao) {
            $where .= ' AND pci.observacao IS NOT NULL AND pci.observacao != ?';
            $whereParams[] = '';
            $whereTypes .= 's';
        }

        if ($noScm) {
            $where .= ' AND pci.id IS NOT NULL AND (pci.scm_number IS NULL OR pci.scm_number = ?)';
            $whereParams[] = '';
            $whereTypes .= 's';
        }

        $scmJoin = '';
        if ($scmLancados && !empty($scmStatuses)) {
            $placeholders = implode(',', array_fill(0, count($scmStatuses), '?'));
            $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number AND s.status IN ({$placeholders})";
            $whereParams = array_merge($scmStatuses, $whereParams);
            $whereTypes = str_repeat('s', count($scmStatuses)) . $whereTypes;
        }

        if (empty($valorCaseSql)) {
            $valorCaseSql = "CASE
                WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
                WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
                ELSE 0
            END";
        }

        $sql = "SELECT
                    e.id AS equipamento_id,
                    e.local,
                    e.equipamento,
                    e.capacidade,
                    e.localidade,
                    e.local_scm,
                    e.mercado,
                    {$valorCaseSql} AS valor,
                    pci.id AS item_id,
                    pci.observacao,
                    pci.scm_number,
                    CASE WHEN pci.id IS NOT NULL THEN 1 ELSE 0 END AS checked
                FROM equipamentos e
                LEFT JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                {$scmJoin}
                WHERE {$where}
                ORDER BY e.local, e.equipamento
                LIMIT ? OFFSET ?";

        $params = array_merge([$ciclo], $whereParams, [$limit, $offset]);
        $types = 's' . $whereTypes . 'ii';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $data;
    }

    public function count(string $ciclo, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, string $excludedEquipment = '', string $excludedLocation = '', array $scmStatuses = []): int
    {
        $where = 'e.equipamento != ? AND e.local != ?';
        $whereParams = [$excludedEquipment, $excludedLocation];
        $whereTypes = 'ss';

        if ($search !== '') {
            $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR e.local_scm LIKE ?)';
            $likeSearch = '%' . $search . '%';
            $whereParams = array_merge($whereParams, [$likeSearch, $likeSearch, $likeSearch, $likeSearch]);
            $whereTypes .= 'ssss';
        }

        if ($checkedOnly) {
            $where .= ' AND pci.id IS NOT NULL';
        }

        if ($hasObservacao) {
            $where .= ' AND pci.observacao IS NOT NULL AND pci.observacao != ?';
            $whereParams[] = '';
            $whereTypes .= 's';
        }

        if ($noScm) {
            $where .= ' AND pci.id IS NOT NULL AND (pci.scm_number IS NULL OR pci.scm_number = ?)';
            $whereParams[] = '';
            $whereTypes .= 's';
        }

        $scmJoin = '';
        if ($scmLancados && !empty($scmStatuses)) {
            $placeholders = implode(',', array_fill(0, count($scmStatuses), '?'));
            $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number AND s.status IN ({$placeholders})";
            $whereParams = array_merge($scmStatuses, $whereParams);
            $whereTypes = str_repeat('s', count($scmStatuses)) . $whereTypes;
        }

        $sql = "SELECT COUNT(*) AS total
                FROM equipamentos e
                LEFT JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                {$scmJoin}
                WHERE {$where}";

        $params = array_merge([$ciclo], $whereParams);
        $types = 's' . $whereTypes;

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int) ($row['total'] ?? 0);
    }

    public function summary(string $ciclo, bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, string $valorCaseSql = '', string $excludedEquipment = '', string $excludedLocation = '', array $scmStatuses = []): array
    {
        if (empty($valorCaseSql)) {
            $valorCaseSql = "CASE
                WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
                WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
                ELSE 0
            END";
        }
        $obsFilter = $hasObservacao
            ? "AND pci.observacao IS NOT NULL AND pci.observacao != ''"
            : "AND (pci.observacao IS NULL OR pci.observacao = '')";
        $scmFilter = $noScm
            ? "AND (pci.scm_number IS NULL OR pci.scm_number = '')"
            : "";
        $params = [$ciclo];
        $types = 's';
        $scmJoin = '';
        if ($scmLancados && !empty($scmStatuses)) {
            $placeholders = implode(',', array_fill(0, count($scmStatuses), '?'));
            $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number AND s.status IN ({$placeholders})";
            array_push($params, ...$scmStatuses);
            $types .= str_repeat('s', count($scmStatuses));
        }
        $sql = "SELECT
                    COUNT(pci.id) AS checked_count,
                    COALESCE(SUM({$valorCaseSql}), 0) AS total_valor,
                    COUNT(DISTINCT e.local) AS site_count
                FROM equipamentos e
                INNER JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                {$scmJoin}
                WHERE e.equipamento != ? AND e.local != ?
                {$obsFilter}
                {$scmFilter}";
        $params[] = $excludedEquipment;
        $params[] = $excludedLocation;
        $types .= 'ss';
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return [
            'checked_count' => (int) ($row['checked_count'] ?? 0),
            'total_valor' => (float) ($row['total_valor'] ?? 0),
            'site_count' => (int) ($row['site_count'] ?? 0),
        ];
    }

    public function listIdsByCiclo(string $ciclo, string $search = '', bool $hasObservacao = false, bool $noScm = false, bool $scmLancados = false, string $excludedEquipment = '', string $excludedLocation = '', array $scmStatuses = []): array
    {
        $where = 'e.equipamento != ? AND e.local != ?';
        $whereParams = [$excludedEquipment, $excludedLocation];
        $whereTypes = 'ss';

        if ($search !== '') {
            $where .= ' AND (e.local LIKE ? OR e.equipamento LIKE ? OR e.localidade LIKE ? OR e.local_scm LIKE ?)';
            $likeSearch = '%' . $search . '%';
            $whereParams = array_merge($whereParams, [$likeSearch, $likeSearch, $likeSearch, $likeSearch]);
            $whereTypes .= 'ssss';
        }

        if ($hasObservacao) {
            $where .= ' AND EXISTS (
                SELECT 1 FROM preventive_cycle_items pci
                WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                AND pci.observacao IS NOT NULL AND pci.observacao != ?
            )';
            $whereParams[] = $ciclo;
            $whereParams[] = '';
            $whereTypes .= 'ss';
        }

        if ($noScm) {
            $where .= ' AND EXISTS (
                SELECT 1 FROM preventive_cycle_items pci
                WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                AND (pci.scm_number IS NULL OR pci.scm_number = ?)
            )';
            $whereParams[] = $ciclo;
            $whereParams[] = '';
            $whereTypes .= 'ss';
        }

        if ($scmLancados && !empty($scmStatuses)) {
            $placeholders = implode(',', array_fill(0, count($scmStatuses), '?'));
            $where .= " AND EXISTS (
                SELECT 1 FROM preventive_cycle_items pci
                INNER JOIN scm s ON s.scm = pci.scm_number
                WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                AND s.status IN ({$placeholders})
            )";
            $whereParams[] = $ciclo;
            $whereParams = array_merge($whereParams, $scmStatuses);
            $whereTypes .= 's' . str_repeat('s', count($scmStatuses));
        }

        $sql = "SELECT e.id FROM equipamentos e WHERE {$where} ORDER BY e.local, e.equipamento";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($whereTypes, ...$whereParams);
        $stmt->execute();
        $result = $stmt->get_result();
        $ids = [];
        while ($row = $result->fetch_assoc()) {
            $ids[] = (int) $row['id'];
        }
        $stmt->close();
        return $ids;
    }

    public function saveBatch(string $ciclo, array $items): array
    {
        $saved = 0;
        $deleted = 0;

        $checkedItems = [];
        $uncheckedIds = [];

        foreach ($items as $item) {
            $equipamentoId = (int) ($item['equipamento_id'] ?? 0);
            if ($equipamentoId <= 0) continue;

            if (!empty($item['checked'])) {
                $observacao = $item['observacao'] ?? '';
                $scmNumber = $item['scm_number'] ?? null;
                if ($scmNumber !== null && trim($scmNumber) === '') {
                    $scmNumber = null;
                }
                $checkedItems[] = [$equipamentoId, $observacao, $scmNumber];
            } else {
                $uncheckedIds[] = $equipamentoId;
            }
        }

        $this->beginTransaction();
        try {
            if (!empty($checkedItems)) {
                $placeholders = [];
                $bindValues = [];
                $bindTypes = '';

                foreach ($checkedItems as $i => $item) {
                    $placeholders[] = '(?, ?, ?, ?)';
                    $bindValues[] = $ciclo;
                    $bindValues[] = $item[0];
                    $bindValues[] = $item[1];
                    $bindValues[] = $item[2];
                    $bindTypes .= 'siss';
                }

                $sql = "INSERT INTO preventive_cycle_items (ciclo, equipamento_id, observacao, scm_number)
                        VALUES " . implode(', ', $placeholders) . "
                        ON DUPLICATE KEY UPDATE observacao = VALUES(observacao), scm_number = VALUES(scm_number), updated_at = NOW()";

                $stmt = $this->safePrepare($sql);
                $stmt->bind_param($bindTypes, ...$bindValues);
                $stmt->execute();
                $saved = $stmt->affected_rows;
                $stmt->close();
            }

            if (!empty($uncheckedIds)) {
                $placeholders = implode(',', array_fill(0, count($uncheckedIds), '?'));
                $sql = "DELETE FROM preventive_cycle_items WHERE ciclo = ? AND equipamento_id IN ({$placeholders})";
                $types = 's' . str_repeat('i', count($uncheckedIds));
                $params = array_merge([$ciclo], $uncheckedIds);

                $stmt = $this->safePrepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $deleted = $stmt->affected_rows;
                $stmt->close();
            }

            $this->commit();
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }

        return ['saved' => $saved, 'deleted' => $deleted];
    }

    public function findScmWithEquipment(string $scmNumber): ?array
    {
        $sql = "SELECT s.scm, s.segmento, s.origem, s.status,
                       e.equipamento, e.mercado, e.local
                FROM scm s
                LEFT JOIN equipamentos e ON e.id = s.equipamento_id
                WHERE s.scm = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $scmNumber);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public function scmStatusCount(string $ciclo, string $excludedEquipment = '', string $excludedLocation = '', array $scmStatusOrder = []): array
    {
        $fieldOrder = !empty($scmStatusOrder) ? implode(', ', array_map(fn($s) => "'{$s}'", $scmStatusOrder)) : "'SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado'";

        $sql = "SELECT s.status, COUNT(DISTINCT e.local) AS site_count
                FROM preventive_cycle_items pci
                INNER JOIN equipamentos e ON e.id = pci.equipamento_id
                INNER JOIN scm s ON s.scm = pci.scm_number
                WHERE pci.ciclo = ?
                  AND pci.scm_number IS NOT NULL AND pci.scm_number != ''
                  AND e.equipamento != ? AND e.local != ?
                GROUP BY s.status
                ORDER BY FIELD(s.status, {$fieldOrder})";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sss', $ciclo, $excludedEquipment, $excludedLocation);
        $stmt->execute();
        $result = $stmt->get_result();
        $counts = [];
        while ($row = $result->fetch_assoc()) {
            $counts[$row['status']] = (int) $row['site_count'];
        }
        $stmt->close();
        return $counts;
    }
}
