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

    public function getActiveRules(): array
    {
        $result = $this->conn->query(
            "SELECT nome, equipamento_pattern, locais_especiais, mercado, valor
             FROM equipamento_precos WHERE ativo = 1
             ORDER BY CASE nome
                 WHEN 'chiller_especial' THEN 1
                 WHEN 'chiller' THEN 2
                 WHEN 'tr' THEN 3
                 ELSE 4
             END"
        );

        if (!$result) {
            return [];
        }

        $rules = [];
        while ($row = $result->fetch_assoc()) {
            $rules[] = $row;
        }

        return $rules;
    }

    public function resolvePrice(string $equipamento, ?string $local, ?float $capacidade, ?array $rules = null, ?string $mercadoEquipamento = null): float
    {
        $rules ??= $this->getActiveRules();

        if (empty($rules)) {
            return 0.0;
        }

        return $this->matchRule($rules, $equipamento, $local, $mercadoEquipamento, $capacidade ?? 0.0);
    }

    public function sumValueByFilter(string $search = '', ?string $location = null): float
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

        $sql = "SELECT COALESCE(SUM(
            CASE
                WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
                WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
                WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
                ELSE 0
            END
        ), 0) AS total
        FROM equipamentos e
        LEFT JOIN enderecos en ON en.id = e.endereco_id
        WHERE {$where}";

        if (!empty($params)) {
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $this->conn->query($sql);
        }

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

        if (!empty($params)) {
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $this->conn->query($sql);
        }

        if (!$result) {
            return 0;
        }

        $row = $result->fetch_assoc();
        return (int) ($row['cnt'] ?? 0);
    }

    private function matchRule(array $rules, string $equipamento, ?string $local, ?string $mercadoEquipamento, float $capacidade): float
    {
        foreach ($rules as $rule) {
            if (!empty($rule['mercado'])) {
                if (empty($mercadoEquipamento) || strtolower($mercadoEquipamento) !== strtolower($rule['mercado'])) {
                    continue;
                }
            }

            if (!empty($rule['equipamento_pattern'])) {
                $pattern = $rule['equipamento_pattern'];
                $regex = '/^' . str_replace(['%', '_'], ['.*', '.'], preg_quote($pattern, '/')) . '$/i';
                if (!preg_match($regex, $equipamento)) {
                    continue;
                }
            }

            if (!empty($rule['locais_especiais'])) {
                $locaisArray = array_map('trim', explode(',', $rule['locais_especiais']));
                if (!in_array($local, $locaisArray, true)) {
                    continue;
                }
            }

            if ($rule['nome'] === 'tr') {
                return round($capacidade * (float) $rule['valor'], 2);
            }
            return (float) $rule['valor'];
        }

        return 0.0;
    }
}
