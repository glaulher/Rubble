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
        } elseif ($scmLancados) {
            $where .= " AND pci.id IS NOT NULL AND pci.scm_number IS NOT NULL AND pci.scm_number != ''";
        }

        $scmJoin = '';
        $resolvedStatusSql = $this->getResolvedStatusSql();
        if (!empty($scmStatuses)) {
            $hasEmAberto = in_array('SCM em aberto', $scmStatuses, true);
            $dbStatuses = array_values(array_filter($scmStatuses, fn($s) => $s !== 'SCM em aberto'));

            if ($hasEmAberto && empty($dbStatuses)) {
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND pci.id IS NOT NULL AND ({$resolvedStatusSql} = 'SCM em aberto' OR s.scm IS NULL)";
            } elseif ($hasEmAberto && !empty($dbStatuses)) {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND pci.id IS NOT NULL AND ({$resolvedStatusSql} IN ({$placeholders}, 'SCM em aberto') OR (pci.scm_number IS NOT NULL AND pci.scm_number != '' AND s.scm IS NULL))";
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= str_repeat('s', count($dbStatuses));
            } else {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND {$resolvedStatusSql} IN ({$placeholders})";
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= str_repeat('s', count($dbStatuses));
            }
        }

        if (empty($scmJoin)) {
            $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
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
                    e.tag_infratel,
                    {$valorCaseSql} AS valor,
                    pci.id AS item_id,
                    pci.observacao,
                    pci.scm_number,
                    CASE WHEN pci.id IS NOT NULL THEN 1 ELSE 0 END AS checked,
                    CASE
                        WHEN pci.id IS NULL THEN ''
                        WHEN pci.scm_number IS NULL OR pci.scm_number = '' THEN 'SCM em aberto'
                        WHEN s.scm IS NULL OR {$resolvedStatusSql} IS NULL OR {$resolvedStatusSql} = '' THEN 'SCM em aberto'
                        ELSE {$resolvedStatusSql}
                    END AS scm_status
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
        } elseif ($scmLancados) {
            $where .= " AND pci.id IS NOT NULL AND pci.scm_number IS NOT NULL AND pci.scm_number != ''";
        }

        $scmJoin = '';
        $resolvedStatusSql = $this->getResolvedStatusSql();
        if (!empty($scmStatuses)) {
            $hasEmAberto = in_array('SCM em aberto', $scmStatuses, true);
            $dbStatuses = array_values(array_filter($scmStatuses, fn($s) => $s !== 'SCM em aberto'));

            if ($hasEmAberto && empty($dbStatuses)) {
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND pci.id IS NOT NULL AND ({$resolvedStatusSql} = 'SCM em aberto' OR s.scm IS NULL)";
            } elseif ($hasEmAberto && !empty($dbStatuses)) {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND pci.id IS NOT NULL AND ({$resolvedStatusSql} IN ({$placeholders}, 'SCM em aberto') OR (pci.scm_number IS NOT NULL AND pci.scm_number != '' AND s.scm IS NULL))";
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= str_repeat('s', count($dbStatuses));
            } else {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number";
                $where .= " AND {$resolvedStatusSql} IN ({$placeholders})";
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= str_repeat('s', count($dbStatuses));
            }
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
        $resolvedStatusSql = $this->getResolvedStatusSql();
        if ($hasObservacao) {
            $obsFilter = "AND pci.observacao IS NOT NULL AND pci.observacao != ''";
        } elseif (!empty($scmStatuses) && in_array('SCM negado', $scmStatuses, true)) {
            $obsFilter = "AND ((pci.observacao IS NULL OR pci.observacao = '') OR {$resolvedStatusSql} = 'SCM negado')";
        } else {
            $obsFilter = "AND (pci.observacao IS NULL OR pci.observacao = '')";
        }
        $scmFilter = '';
        if ($noScm) {
            $scmFilter = "AND (pci.scm_number IS NULL OR pci.scm_number = '')";
        } elseif ($scmLancados) {
            $scmFilter = "AND (pci.scm_number IS NOT NULL AND pci.scm_number != '')";
        }
        $params = [$ciclo];
        $types = 's';
        $scmJoin = '';
        $scmStatusFilter = '';
        $scmStatusParams = [];
        if (!empty($scmStatuses)) {
            $hasEmAberto = in_array('SCM em aberto', $scmStatuses, true);
            $dbStatuses = array_values(array_filter($scmStatuses, fn($s) => $s !== 'SCM em aberto'));

            if ($hasEmAberto && empty($dbStatuses)) {
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $scmStatusFilter = "AND ({$resolvedStatusSql} = 'SCM em aberto' OR s.scm IS NULL)";
            } elseif ($hasEmAberto && !empty($dbStatuses)) {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
                $scmStatusFilter = "AND ({$resolvedStatusSql} IN ({$placeholders}, 'SCM em aberto') OR (pci.scm_number IS NOT NULL AND pci.scm_number != '' AND s.scm IS NULL))";
                $scmStatusParams = $dbStatuses;
            } else {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $scmJoin = " INNER JOIN scm s ON s.scm = pci.scm_number";
                $scmStatusFilter = "AND {$resolvedStatusSql} IN ({$placeholders})";
                $scmStatusParams = $dbStatuses;
            }
        }
        if (empty($scmJoin)) {
            $scmJoin = " LEFT JOIN scm s ON s.scm = pci.scm_number";
        }
        $excludeNegadoClause = (!in_array('SCM negado', $scmStatuses, true))
            ? "AND (s.scm IS NULL OR {$resolvedStatusSql} != 'SCM negado')"
            : "";
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
                {$scmFilter}
                {$scmStatusFilter}
                {$excludeNegadoClause}";
        $params = array_merge([$ciclo, $excludedEquipment, $excludedLocation], $scmStatusParams);
        $types = 'sss' . str_repeat('s', count($scmStatusParams));
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
        } elseif ($scmLancados) {
            $where .= ' AND EXISTS (
                SELECT 1 FROM preventive_cycle_items pci
                WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                AND pci.scm_number IS NOT NULL AND pci.scm_number != ?
            )';
            $whereParams[] = $ciclo;
            $whereParams[] = '';
            $whereTypes .= 'ss';
        }

        $resolvedStatusSql = $this->getResolvedStatusSql();
        if (!empty($scmStatuses)) {
            $hasEmAberto = in_array('SCM em aberto', $scmStatuses, true);
            $dbStatuses = array_values(array_filter($scmStatuses, fn($s) => $s !== 'SCM em aberto'));

            if ($hasEmAberto && empty($dbStatuses)) {
                $where .= " AND EXISTS (
                    SELECT 1 FROM preventive_cycle_items pci
                    LEFT JOIN scm s ON s.scm = pci.scm_number
                    WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                    AND ({$resolvedStatusSql} = 'SCM em aberto' OR s.scm IS NULL)
                )";
                $whereParams[] = $ciclo;
                $whereTypes .= 's';
            } elseif ($hasEmAberto && !empty($dbStatuses)) {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $where .= " AND EXISTS (
                    SELECT 1 FROM preventive_cycle_items pci
                    LEFT JOIN scm s ON s.scm = pci.scm_number
                    WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                    AND ({$resolvedStatusSql} IN ({$placeholders}, 'SCM em aberto') OR (pci.scm_number IS NOT NULL AND pci.scm_number != '' AND s.scm IS NULL))
                )";
                $whereParams[] = $ciclo;
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= 's' . str_repeat('s', count($dbStatuses));
            } else {
                $placeholders = implode(',', array_fill(0, count($dbStatuses), '?'));
                $where .= " AND EXISTS (
                    SELECT 1 FROM preventive_cycle_items pci
                    INNER JOIN scm s ON s.scm = pci.scm_number
                    WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                    AND {$resolvedStatusSql} IN ({$placeholders})
                )";
                $whereParams[] = $ciclo;
                $whereParams = array_merge($whereParams, $dbStatuses);
                $whereTypes .= 's' . str_repeat('s', count($dbStatuses));
            }
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
                $observacao = array_key_exists('observacao', $item) ? $item['observacao'] : '';
                $scmNumber = array_key_exists('scm_number', $item) ? $item['scm_number'] : null;
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
                        ON DUPLICATE KEY UPDATE
                          observacao = COALESCE(VALUES(observacao), observacao),
                          scm_number = COALESCE(VALUES(scm_number), scm_number),
                          updated_at = NOW()";

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

    public function findScmWithEquipment(string $scmNumber, int $equipamentoId = 0): ?array
    {
        $resolvedStatusSql = $this->getResolvedStatusSql();
        $sql = "SELECT s.scm, s.segmento, s.origem,
                       COALESCE(
                           CASE
                               WHEN e.id IS NOT NULL THEN {$resolvedStatusSql}
                               ELSE (
                                   SELECT si_fb.status
                                   FROM scm_items si_fb
                                   WHERE si_fb.scm_id = s.id
                                     AND si_fb.status IS NOT NULL
                                     AND si_fb.status != ''
                                   ORDER BY FIELD(si_fb.status, 'SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'), si_fb.id ASC
                                   LIMIT 1
                               )
                           END,
                           'SCM em aberto'
                       ) AS status,
                       COALESCE(e.equipamento, eq_s.equipamento) AS equipamento,
                       COALESCE(e.mercado, eq_s.mercado) AS mercado,
                       COALESCE(e.local, eq_s.local) AS local
                FROM scm s
                LEFT JOIN equipamentos e ON e.id = ?
                LEFT JOIN equipamentos eq_s ON eq_s.id = s.equipamento_id
                WHERE s.scm = ?
                LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('is', $equipamentoId, $scmNumber);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public function scmStatusCount(string $ciclo, string $excludedEquipment = '', string $excludedLocation = '', array $scmStatusOrder = []): array
    {
        $fieldOrder = !empty($scmStatusOrder)
            ? implode(', ', array_map(fn($s) => "'{$s}'", $scmStatusOrder))
            : "'SCM em aberto', 'SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado'";

        $resolvedStatusSql = $this->getResolvedStatusSql();
        $sql = "SELECT
                    CASE
                        WHEN s.scm IS NULL OR {$resolvedStatusSql} IS NULL OR {$resolvedStatusSql} = '' THEN 'SCM em aberto'
                        ELSE {$resolvedStatusSql}
                    END AS status_name,
                    COUNT(DISTINCT e.local) AS site_count
                FROM preventive_cycle_items pci
                INNER JOIN equipamentos e ON e.id = pci.equipamento_id
                LEFT JOIN scm s ON s.scm = pci.scm_number
                WHERE pci.ciclo = ?
                  AND e.equipamento != ? AND e.local != ?
                GROUP BY status_name
                ORDER BY FIELD(status_name, {$fieldOrder})";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sss', $ciclo, $excludedEquipment, $excludedLocation);
        $stmt->execute();
        $result = $stmt->get_result();
        $counts = [];
        while ($row = $result->fetch_assoc()) {
            $counts[$row['status_name']] = (int) $row['site_count'];
        }
        $stmt->close();
        return $counts;
    }

    public function autoLinkScms(string $ciclo, bool $force = false): int
    {
        $this->beginTransaction();
        try {
            $whereClause = $force
                ? "matched.scm IS NOT NULL AND (pci.scm_number IS NULL OR pci.scm_number != matched.scm)"
                : "(pci.observacao IS NULL OR pci.observacao = '') AND (pci.scm_number IS NULL OR pci.scm_number = '' OR cur_s.scm IS NULL OR EXISTS (SELECT 1 FROM scm_items cur_si WHERE cur_si.scm_id = cur_s.id AND cur_si.status = 'SCM negado'))";

            $sqlUpdate = "UPDATE preventive_cycle_items pci
                JOIN (
                    SELECT equip_id, scm, status
                    FROM (
                        SELECT e.id as equip_id, s.scm,
                               COALESCE(
                                   (SELECT si_r.status FROM scm_items si_r WHERE si_r.scm_id = s.id AND si_r.status IS NOT NULL AND si_r.status != '' ORDER BY FIELD(si_r.status, 'SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'), si_r.id ASC LIMIT 1),
                                   'SCM em aberto'
                               ) as status,
                               ROW_NUMBER() OVER (
                                   PARTITION BY e.id 
                                   ORDER BY FIELD(
                                       COALESCE(
                                           (SELECT si_r.status FROM scm_items si_r WHERE si_r.scm_id = s.id AND si_r.status IS NOT NULL AND si_r.status != '' ORDER BY FIELD(si_r.status, 'SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'), si_r.id ASC LIMIT 1),
                                           'SCM em aberto'
                                       ),
                                       'SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'
                                   ), s.id DESC
                               ) as rn
                        FROM equipamentos e
                        JOIN scm s ON (
                            e.local_scm = s.site 
                            OR e.local = s.site 
                            OR e.site_infratel = s.site
                            OR e.id = s.equipamento_id
                        )
                        WHERE (s.segmento LIKE '%PREVENTIVA%' OR s.atividade LIKE '%PREVENTIVA%' OR s.atividade LIKE '%CHILLER%')
                          AND (
                            (s.atividade LIKE '%CHILLER%' AND e.equipamento LIKE '%chiller%')
                            OR (s.atividade NOT LIKE '%CHILLER%' AND e.equipamento NOT LIKE '%chiller%')
                          )
                          AND COALESCE(DATE_FORMAT(s.data_validacao, '%Y-%m'), DATE_FORMAT(s.data_execucao, '%Y-%m'), DATE_FORMAT(s.data, '%Y-%m')) = ?
                          AND (
                            NOT EXISTS (SELECT 1 FROM scm_items si_chk WHERE si_chk.scm_id = s.id)
                            OR EXISTS (
                                SELECT 1 FROM scm_items si
                                WHERE si.scm_id = s.id
                                  AND (
                                    si.servico LIKE CONCAT('%', e.equipamento, '%')
                                    OR REPLACE(si.servico, ' ', '') LIKE CONCAT('%', REPLACE(e.equipamento, ' ', ''), '%')
                                    OR (
                                        e.localidade IS NOT NULL 
                                        AND e.localidade != '' 
                                        AND LENGTH(TRIM(e.localidade)) >= 3
                                        AND si.servico LIKE CONCAT('%', TRIM(e.localidade), '%')
                                    )
                                    OR (
                                        (SELECT COUNT(*) FROM equipamentos e_sub 
                                         WHERE e_sub.local = e.local 
                                           AND (
                                             (e.equipamento LIKE '%chiller%' AND e_sub.equipamento LIKE '%chiller%')
                                             OR (e.equipamento NOT LIKE '%chiller%' AND e_sub.equipamento NOT LIKE '%chiller%')
                                           )
                                        ) = 1
                                    )
                                  )
                            )
                          )
                    ) ranked
                    WHERE rn = 1
                ) matched ON matched.equip_id = pci.equipamento_id AND pci.ciclo = ?
                LEFT JOIN scm cur_s ON cur_s.scm = pci.scm_number
                SET pci.scm_number = matched.scm
                WHERE {$whereClause}";

            $stmtUpdate = $this->safePrepare($sqlUpdate);
            $stmtUpdate->bind_param('ss', $ciclo, $ciclo);
            $stmtUpdate->execute();
            $updated = $stmtUpdate->affected_rows;
            $stmtUpdate->close();

            $this->commit();
            return $updated;
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }
    }

    private function getResolvedStatusSql(): string
    {
        return "COALESCE(
            (
                SELECT si.status
                FROM scm_items si
                WHERE si.scm_id = s.id
                  AND si.status IS NOT NULL
                  AND si.status != ''
                  AND (
                      (e.localidade IS NOT NULL AND e.localidade != '' AND LENGTH(TRIM(e.localidade)) >= 3
                       AND (
                           si.servico LIKE CONCAT('%', TRIM(e.localidade), '%')
                           OR (e.localidade LIKE '%/%' AND si.servico LIKE CONCAT('%', SUBSTRING_INDEX(e.localidade, '/', -1), '%'))
                           OR (e.localidade LIKE '%/%' AND si.servico LIKE CONCAT('%', SUBSTRING_INDEX(e.localidade, '/', 1), '%'))
                           OR (e.localidade LIKE '%EQUIPAMENTOS%' AND si.servico LIKE '%EQUIPAMENTOS%')
                           OR (e.localidade LIKE '%BATERIAS%' AND si.servico LIKE '%BATERIAS%')
                           OR (e.localidade LIKE '%SUBESTA%' AND si.servico LIKE '%SUBESTA%')
                           OR (e.localidade LIKE '%NO-BREAK%' AND si.servico LIKE '%NO-BREAK%')
                           OR (e.localidade LIKE '%CONTAINER%' AND si.servico LIKE CONCAT('%', TRIM(SUBSTRING_INDEX(e.localidade, '-', 1)), '%'))
                       )
                      )
                      OR si.servico LIKE CONCAT('%', e.equipamento, '%')
                      OR REPLACE(si.servico, ' ', '') LIKE CONCAT('%', REPLACE(e.equipamento, ' ', ''), '%')
                      OR (e.equipamento LIKE '% 0%' AND si.servico LIKE CONCAT('%', REPLACE(e.equipamento, ' 0', ' '), '%'))
                      OR (e.equipamento LIKE '%SELF SPLIT%' AND si.servico LIKE '%SELF SPLIT%')
                      OR (e.equipamento NOT LIKE '%SELF SPLIT%' AND e.equipamento LIKE '%SELF%' AND si.servico LIKE '%SELF %' AND si.servico NOT LIKE '%SELF SPLIT%')
                      OR (e.equipamento LIKE '%WM%' AND si.servico LIKE '%WM%')
                      OR (e.equipamento LIKE '%CHILLER%' AND si.servico LIKE '%CHILLER%')
                      OR (
                          -- Match pelo prefixo do tipo (ex: 'WM-', 'ACJ-', 'SELF-') + parte da localidade
                          -- Cobre servicos no formato: 'N - TIPO-SITE-MARCA-MODELO-CONTAINER X - LOCAL'
                          LENGTH(SUBSTRING_INDEX(e.equipamento, ' ', 1)) >= 2
                          AND si.servico LIKE CONCAT('%', SUBSTRING_INDEX(e.equipamento, ' ', 1), '-%')
                          AND (
                              e.localidade IS NULL OR e.localidade = '' OR LENGTH(TRIM(e.localidade)) < 3
                              OR si.servico LIKE CONCAT('%', SUBSTRING_INDEX(TRIM(e.localidade), ' -', 1), '%')
                          )
                      )
                  )
                ORDER BY
                    (CASE WHEN e.localidade IS NOT NULL AND e.localidade != '' AND si.servico LIKE CONCAT('%', TRIM(e.localidade), '%') THEN 10 ELSE 0 END
                     + CASE WHEN si.servico LIKE CONCAT('%', e.equipamento, '%') THEN 10 ELSE 0 END
                     + CASE WHEN e.equipamento LIKE '% 0%' AND si.servico LIKE CONCAT('%', REPLACE(e.equipamento, ' 0', ' '), '%') THEN 8 ELSE 0 END
                     + CASE WHEN e.localidade LIKE '%EQUIPAMENTOS%' AND si.servico LIKE '%EQUIPAMENTOS%' THEN 5 ELSE 0 END
                     + CASE WHEN e.localidade LIKE '%SUBESTA%' AND si.servico LIKE '%SUBESTA%' THEN 5 ELSE 0 END
                     + CASE WHEN e.localidade LIKE '%BATERIAS%' AND si.servico LIKE '%BATERIAS%' THEN 5 ELSE 0 END
                     + CASE WHEN e.localidade LIKE '%CONTAINER%' AND si.servico LIKE CONCAT('%', TRIM(SUBSTRING_INDEX(e.localidade, '-', 1)), '%') THEN 5 ELSE 0 END
                     + CASE WHEN e.equipamento LIKE '%SELF SPLIT%' AND si.servico LIKE '%SELF SPLIT%' THEN 4 ELSE 0 END
                     + CASE WHEN e.equipamento NOT LIKE '%SELF SPLIT%' AND e.equipamento LIKE '%SELF%' AND si.servico LIKE '%SELF %' AND si.servico NOT LIKE '%SELF SPLIT%' THEN 4 ELSE 0 END
                     + CASE WHEN e.equipamento LIKE '%CHILLER%' AND si.servico LIKE '%CHILLER%' THEN 3 ELSE 0 END
                     + CASE WHEN e.equipamento LIKE '%WM%' AND si.servico LIKE '%WM%' THEN 3 ELSE 0 END
                     + CASE WHEN LENGTH(SUBSTRING_INDEX(e.equipamento, ' ', 1)) >= 2
                              AND si.servico LIKE CONCAT('%', SUBSTRING_INDEX(e.equipamento, ' ', 1), '-%')
                              AND (e.localidade IS NULL OR e.localidade = '' OR si.servico LIKE CONCAT('%', SUBSTRING_INDEX(TRIM(e.localidade), ' -', 1), '%'))
                              THEN 6 ELSE 0 END
                    ) DESC,
                    si.id ASC
                LIMIT 1
            ),
            (
                -- Fallback restrito: apenas quando o SCM tem itens sem descricao de servico.
                -- Evita atribuir status de outro equipamento quando ha multiplos equipamentos no site.
                SELECT si_def.status
                FROM scm_items si_def
                WHERE si_def.scm_id = s.id
                  AND si_def.status IS NOT NULL
                  AND si_def.status != ''
                  AND (si_def.servico IS NULL OR si_def.servico = '')
                ORDER BY FIELD(si_def.status, 'SCM aprovado', 'SCM verificado', 'SCM enviado', 'SCM em aberto', 'SCM negado'), si_def.id ASC
                LIMIT 1
            ),
            'SCM em aberto'
        )";
    }
}
