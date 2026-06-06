<?php

namespace App\Api\Repositories;

use App\Api\Entities\EquipmentPrice;

class EquipmentPriceRepository extends BaseRepository
{
    public function listAll(): array
    {
        $sql = "SELECT * FROM equipamento_precos ORDER BY id";
        $result = $this->conn->query($sql);

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
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        return $row ? new EquipmentPrice($row) : null;
    }

    public function save(array $data): int
    {
        $sql = "INSERT INTO equipamento_precos (nome, equipamento_pattern, locais_especiais, mercado, valor, ativo)
                VALUES (?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
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

        $stmt = $this->conn->prepare($sql);
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
        $stmt = $this->conn->prepare($sql);
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
            $trValue = (float) Env::get('TR_VALUE', '94');
            return round(($capacidade ?? 0) * $trValue, 2);
        }

        return $this->matchRule($rules, $equipamento, $local, $mercadoEquipamento, $capacidade ?? 0.0);
    }

    public function sumValueByFilter(string $search = '', ?string $location = null): float
    {
        $rules = $this->getActiveRules();

        if (empty($rules)) {
            return $this->sumValueFallback();
        }

        $equipmentResult = $this->conn->query(
            "SELECT e.equipamento, e.local, e.capacidade, e.mercado
             FROM equipamentos e WHERE e.equipamento != 'N/A'"
        );

        if (!$equipmentResult) {
            return 0.0;
        }

        $total = 0.0;
        while ($eq = $equipmentResult->fetch_assoc()) {
            $total += $this->matchRule(
                $rules,
                $eq['equipamento'],
                $eq['local'],
                $eq['mercado'] ?? null,
                (float) $eq['capacidade']
            );
        }

        return round($total, 2);
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

        $trValue = (float) Env::get('TR_VALUE', '94');
        return round($capacidade * $trValue, 2);
    }

    private function sumValueFallback(): float
    {
        $result = $this->conn->query(
            "SELECT SUM(capacidade) as total FROM equipamentos WHERE equipamento != 'N/A'"
        );
        if (!$result) {
            return 0.0;
        }
        $row = $result->fetch_assoc();
        $trValue = (float) Env::get('TR_VALUE', '94');
        return round(((float) ($row['total'] ?? 0)) * $trValue, 2);
    }
}
