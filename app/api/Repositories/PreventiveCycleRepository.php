<?php

namespace App\Api\Repositories;

class PreventiveCycleRepository extends BaseRepository
{
    private function valorCaseSql(): string
    {
        return "CASE
            WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
            WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
            WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
            WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
            ELSE 0
        END";
    }

    public function listByCiclo(string $ciclo, int $limit, int $offset, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false): array
    {
        $where = 'e.equipamento != ? AND e.local != ?';
        $whereParams = ['N/A', 'Fornecimento'];
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

        $valorCase = $this->valorCaseSql();

        $sql = "SELECT
                    e.id AS equipamento_id,
                    e.local,
                    e.equipamento,
                    e.capacidade,
                    e.localidade,
                    e.local_scm,
                    e.mercado,
                    {$valorCase} AS valor,
                    pci.id AS item_id,
                    pci.observacao,
                    CASE WHEN pci.id IS NOT NULL THEN 1 ELSE 0 END AS checked
                FROM equipamentos e
                LEFT JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                WHERE {$where}
                ORDER BY e.local, e.equipamento
                LIMIT ? OFFSET ?";

        $params = array_merge([$ciclo], $whereParams, [$limit, $offset]);
        $types = 's' . $whereTypes . 'ii';

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $data;
    }

    public function count(string $ciclo, string $search = '', bool $checkedOnly = false, bool $hasObservacao = false): int
    {
        $where = 'e.equipamento != ? AND e.local != ?';
        $whereParams = ['N/A', 'Fornecimento'];
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

        $sql = "SELECT COUNT(*) AS total
                FROM equipamentos e
                LEFT JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                WHERE {$where}";

        $params = array_merge([$ciclo], $whereParams);
        $types = 's' . $whereTypes;

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int) ($row['total'] ?? 0);
    }

    public function summary(string $ciclo): array
    {
        $valorCase = $this->valorCaseSql();
        $sql = "SELECT
                    COUNT(pci.id) AS checked_count,
                    COALESCE(SUM({$valorCase}), 0) AS total_valor
                FROM equipamentos e
                INNER JOIN preventive_cycle_items pci
                    ON pci.equipamento_id = e.id AND pci.ciclo = ?
                WHERE e.equipamento != 'N/A' AND e.local != 'Fornecimento'
                AND (pci.observacao IS NULL OR pci.observacao = '')";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $ciclo);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return [
            'checked_count' => (int) ($row['checked_count'] ?? 0),
            'total_valor' => (float) ($row['total_valor'] ?? 0),
        ];
    }

    public function checkAll(string $ciclo, bool $hasObservacao = false): int
    {
        if ($hasObservacao) {
            $sql = "INSERT IGNORE INTO preventive_cycle_items (ciclo, equipamento_id)
                    SELECT ?, e.id FROM equipamentos e
                    WHERE e.equipamento != 'N/A' AND e.local != 'Fornecimento'
                    AND EXISTS (
                        SELECT 1 FROM preventive_cycle_items pci
                        WHERE pci.equipamento_id = e.id AND pci.ciclo = ?
                        AND pci.observacao IS NOT NULL AND pci.observacao != ''
                    )";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('ss', $ciclo, $ciclo);
        } else {
            $sql = "INSERT IGNORE INTO preventive_cycle_items (ciclo, equipamento_id)
                    SELECT ?, e.id FROM equipamentos e
                    WHERE e.equipamento != 'N/A' AND e.local != 'Fornecimento'";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('s', $ciclo);
        }
        $stmt->execute();
        $count = $stmt->affected_rows;
        $stmt->close();
        return $count;
    }

    public function uncheckAll(string $ciclo, bool $hasObservacao = false): int
    {
        if ($hasObservacao) {
            $sql = "DELETE FROM preventive_cycle_items WHERE ciclo = ?
                    AND observacao IS NOT NULL AND observacao != ''";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('s', $ciclo);
        } else {
            $sql = "DELETE FROM preventive_cycle_items WHERE ciclo = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('s', $ciclo);
        }
        $stmt->execute();
        $count = $stmt->affected_rows;
        $stmt->close();
        return $count;
    }

    public function saveBatch(string $ciclo, array $items): array
    {
        $saved = 0;
        $deleted = 0;

        foreach ($items as $item) {
            $equipamentoId = (int) ($item['equipamento_id'] ?? 0);
            if ($equipamentoId <= 0) continue;

            $checked = !empty($item['checked']);
            $observacao = $item['observacao'] ?? '';

            if ($checked) {
                $sql = "INSERT INTO preventive_cycle_items (ciclo, equipamento_id, observacao)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE observacao = VALUES(observacao), updated_at = NOW()";
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param('sis', $ciclo, $equipamentoId, $observacao);
                $stmt->execute();
                if ($stmt->affected_rows > 0) $saved++;
                $stmt->close();
            } else {
                $sql = "DELETE FROM preventive_cycle_items WHERE ciclo = ? AND equipamento_id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param('si', $ciclo, $equipamentoId);
                $stmt->execute();
                if ($stmt->affected_rows > 0) $deleted++;
                $stmt->close();
            }
        }

        return ['saved' => $saved, 'deleted' => $deleted];
    }
}
