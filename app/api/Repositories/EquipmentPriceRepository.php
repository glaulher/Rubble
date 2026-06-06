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
            'ssssdi',
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

    public function resolvePrice(string $equipamento, ?string $local, ?float $capacidade): float
    {
        $sql = "SELECT nome, equipamento_pattern, locais_especiais, mercado, valor
                FROM equipamento_precos
                WHERE ativo = 1
                ORDER BY
                    CASE nome
                        WHEN 'chiller_especial' THEN 1
                        WHEN 'chiller' THEN 2
                        WHEN 'tr' THEN 3
                        ELSE 4
                    END";

        $result = $this->conn->query($sql);

        if (!$result) {
            error_log('EquipmentPriceRepository resolvePrice error: ' . $this->conn->error);
            $trValue = (float) Env::get('TR_VALUE', '94');
            return round(($capacidade ?? 0) * $trValue, 2);
        }

        $equipamentoLower = strtolower($equipamento);

        while ($row = $result->fetch_assoc()) {
            $pattern = $row['equipamento_pattern'];
            $locais = $row['locais_especiais'];
            $mercadoRegra = $row['mercado'];
            $valor = (float) $row['valor'];

            if ($mercadoRegra !== null && $mercadoRegra !== '') {
                if ($local !== null && $local !== '' && $equipamento !== null && $equipamento !== '') {
                    $sqlMercado = "SELECT mercado FROM equipamentos
                                   WHERE equipamento = ? AND local = ? LIMIT 1";
                    $stmtMercado = $this->conn->prepare($sqlMercado);
                    $stmtMercado->bind_param('ss', $equipamento, $local);
                    $stmtMercado->execute();
                    $resultMercado = $stmtMercado->get_result()->fetch_assoc();

                    if (!$resultMercado || strtolower($resultMercado['mercado']) !== strtolower($mercadoRegra)) {
                        continue;
                    }
                } else {
                    continue;
                }
            }

            if ($pattern !== null && $pattern !== '') {
                if ($local !== null && $local !== '') {
                    $sqlCheck = "SELECT COUNT(*) as cnt FROM equipamentos
                                 WHERE LOWER(equipamento) LIKE ? AND local = ?";
                    $stmtCheck = $this->conn->prepare($sqlCheck);
                    $stmtCheck->bind_param('ss', $pattern, $local);
                    $stmtCheck->execute();
                    $cnt = (int) $stmtCheck->get_result()->fetch_assoc()['cnt'];

                    if ($cnt === 0) {
                        continue;
                    }
                } else {
                    continue;
                }
            }

            if ($locais !== null && $locais !== '') {
                $locaisArray = array_map('trim', explode(',', $locais));
                if (!in_array($local, $locaisArray, true)) {
                    continue;
                }
            }

            if ($row['nome'] === 'tr') {
                return round(($capacidade ?? 0) * $valor, 2);
            }

            return $valor;
        }

        $trValue = (float) Env::get('TR_VALUE', '94');
        return round(($capacidade ?? 0) * $trValue, 2);
    }

    public function sumValueByFilter(string $search = '', ?string $location = null): float
    {
        $equipamentos = $this->conn->query(
            "SELECT e.equipamento, e.local, e.capacidade
             FROM equipamentos e
             LEFT JOIN enderecos en ON en.id = e.endereco_id
             WHERE e.equipamento != 'N/A'"
        );

        if (!$equipamentos) {
            return 0.0;
        }

        $total = 0.0;
        while ($row = $equipamentos->fetch_assoc()) {
            $total += $this->resolvePrice(
                $row['equipamento'],
                $row['local'],
                (float) $row['capacidade']
            );
        }

        return round($total, 2);
    }
}
