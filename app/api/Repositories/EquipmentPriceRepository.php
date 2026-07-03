<?php

namespace App\Api\Repositories;

use App\Api\Entities\EquipmentPrice;

class EquipmentPriceRepository extends BaseRepository
{
    public function listAll(int $limit = 100, int $offset = 0): array
    {
        $sql = "SELECT * FROM equipamento_precos ORDER BY id LIMIT ? OFFSET ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ii', $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();

        if (!$result) {
            error_log('EquipmentPriceRepository listAll error: ' . $this->conn->error);
            throw new \RuntimeException('Erro interno na consulta');
        }

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = new EquipmentPrice($row);
        }

        return $items;
    }

    public function getById(int $id): ?EquipmentPrice
    {
        $sql = "SELECT * FROM equipamento_precos WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return $row ? new EquipmentPrice($row) : null;
    }

    public function save(array $data): int
    {
        $sql = "INSERT INTO equipamento_precos (nome, equipamento_pattern, locais_especiais, mercado, valor, ativo)
                VALUES (?, ?, ?, ?, ?, ?)";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'ssssdi',
            $data['nome'],
            $data['equipamento_pattern'],
            $data['locais_especiais'],
            $data['mercado'],
            $data['valor'],
            $data['ativo']
        );
        $stmt->execute();

        return (int) $stmt->insert_id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = "UPDATE equipamento_precos
                SET nome = ?, equipamento_pattern = ?, locais_especiais = ?, mercado = ?, valor = ?, ativo = ?
                WHERE id = ?";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'ssssdii',
            $data['nome'],
            $data['equipamento_pattern'],
            $data['locais_especiais'],
            $data['mercado'],
            $data['valor'],
            $data['ativo'],
            $id
        );
        $stmt->execute();

        return $stmt->affected_rows > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM equipamento_precos WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();

        return $stmt->affected_rows > 0;
    }

    public function getActiveRules(array $priorityOrder = []): array
    {
        $orderBy = 'id';
        if (!empty($priorityOrder)) {
            $cases = [];
            foreach ($priorityOrder as $name => $rank) {
                $cases[] = "WHEN '" . $this->conn->real_escape_string($name) . "' THEN " . (int) $rank;
            }
            $elseRank = count($priorityOrder) + 1;
            $orderBy = 'CASE nome ' . implode(' ', $cases) . " ELSE {$elseRank} END";
        }

        $stmt = $this->safePrepare(
            "SELECT nome, equipamento_pattern, locais_especiais, mercado, valor
             FROM equipamento_precos WHERE ativo = 1
             ORDER BY {$orderBy}"
        );
        $stmt->execute();
        $result = $stmt->get_result();

        $rules = [];
        while ($row = $result->fetch_assoc()) {
            $rules[] = $row;
        }

        return $rules;
    }

    public function sumValueByFilter(string $search = '', ?string $location = null, string $valorCaseSql = ''): float
    {
        $conditions = ["e.equipamento != 'N/A'"];
        $params = [];
        $types = '';

        if ($location !== null && $location !== '') {
            $conditions[] = "e.local = ?";
            $params[] = $location;
            $types .= 's';
        }

        if ($search !== '') {
            $conditions[] = "(
                e.local LIKE ?
                OR e.equipamento LIKE ?
                OR en.local_do_endereco LIKE ?
                OR en.endereco LIKE ?
                OR EXISTS (
                    SELECT 1 FROM registros r
                    WHERE r.equipamento_id = e.id
                    AND (r.status LIKE ? OR r.obs LIKE ? OR r.material LIKE ? OR r.os LIKE ?)
                )
            )";
            $param = "%{$search}%";
            $params = array_merge($params, [$param, $param, $param, $param, $param, $param, $param, $param]);
            $types .= 'ssssssss';
        }

        $where = implode(' AND ', $conditions);

        if (empty($valorCaseSql)) {
            $valorCaseSql = "CASE
                WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
                WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
                ELSE 0
            END";
        }

        $sql = "SELECT COALESCE(SUM(
            {$valorCaseSql}
        ), 0) AS total
        FROM equipamentos e
        LEFT JOIN enderecos en ON en.id = e.endereco_id
        WHERE {$where}";

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        if (!$result) {
            return 0.0;
        }

        $row = $result->fetch_assoc();
        return round((float) ($row['total'] ?? 0), 2);
    }

    public function countByFilter(string $search = '', ?string $location = null): int
    {
        $conditions = ["e.equipamento != 'N/A'"];
        $params = [];
        $types = '';

        if ($location !== null && $location !== '') {
            $conditions[] = "e.local = ?";
            $params[] = $location;
            $types .= 's';
        }

        if ($search !== '') {
            $conditions[] = "(
                e.local LIKE ?
                OR e.equipamento LIKE ?
                OR en.local_do_endereco LIKE ?
                OR en.endereco LIKE ?
                OR EXISTS (
                    SELECT 1 FROM registros r
                    WHERE r.equipamento_id = e.id
                    AND (r.status LIKE ? OR r.obs LIKE ? OR r.material LIKE ? OR r.os LIKE ?)
                )
            )";
            $param = "%{$search}%";
            $params = array_merge($params, [$param, $param, $param, $param, $param, $param, $param, $param]);
            $types .= 'ssssssss';
        }

        $where = implode(' AND ', $conditions);

        $sql = "SELECT COUNT(*) AS cnt
                FROM equipamentos e
                LEFT JOIN enderecos en ON en.id = e.endereco_id
                WHERE {$where}";

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        if (!$result) {
            return 0;
        }

        $row = $result->fetch_assoc();
        return (int) ($row['cnt'] ?? 0);
    }

}
