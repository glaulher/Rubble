<?php

namespace App\Api\Repositories;

class FilterExchangeRepository extends BaseRepository
{
    public function listAll(
        int $limit,
        int $offset,
        string $search = '',
        string $status = '',
        string $sortBy = 'f.local',
        string $sortDir = 'ASC'
    ): array {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $sql = "SELECT f.id, f.local, f.equipamento, f.uf, f.regiao, f.tamanho, f.qtd, f.os,
                       f.data_troca, f.data_proxima_troca, f.intervalo_meses
                FROM filtro_trocas f
                WHERE {$where}
                ORDER BY {$sortBy} {$sortDir}
                LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->safePrepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        $stmt->close();

        return $items;
    }

    public function count(string $search = '', string $status = ''): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $sql = "SELECT COUNT(*) AS total
                FROM filtro_trocas f
                WHERE {$where}";

        $stmt = $this->safePrepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        return (int) ($row['total'] ?? 0);
    }

    public function sumQtd(string $search = '', string $status = ''): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status);

        $sql = "SELECT COALESCE(SUM(f.qtd), 0) AS total_qtd
                FROM filtro_trocas f
                WHERE {$where}";

        $stmt = $this->safePrepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        return (int) ($row['total_qtd'] ?? 0);
    }

    public function getById(int $id): ?array
    {
        $sql = "SELECT f.id, f.local, f.equipamento, f.uf, f.regiao, f.tamanho, f.qtd, f.os,
                       f.data_troca, f.data_proxima_troca, f.intervalo_meses
                FROM filtro_trocas f
                WHERE f.id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        return $row ?: null;
    }

    public function create(array $data): bool
    {
        $sql = "INSERT INTO filtro_trocas (local, equipamento, uf, regiao, tamanho, qtd)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->safePrepare($sql);
        $types = 'sssssi';
        $stmt->bind_param(
            $types,
            $data['local'],
            $data['equipamento'],
            $data['uf'],
            $data['regiao'],
            $data['tamanho'],
            $data['qtd']
        );
        $result = $stmt->execute();
        $stmt->close();

        return $result;
    }

    public function updateField(int $id, string $field, $value): bool
    {
        $allowed = ['local', 'equipamento', 'uf', 'regiao', 'tamanho', 'qtd', 'os', 'data_troca', 'data_proxima_troca', 'intervalo_meses'];
        if (!in_array($field, $allowed, true)) {
            throw new \InvalidArgumentException('Campo inválido: ' . $field);
        }

        $sql = "UPDATE filtro_trocas SET {$field} = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);

        if (in_array($field, ['qtd', 'intervalo_meses'], true)) {
            $types = 'ii';
        } else {
            $types = 'si';
        }
        $stmt->bind_param($types, $value, $id);
        $result = $stmt->execute();
        $stmt->close();

        return $result;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM filtro_trocas WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $result = $stmt->execute();
        $stmt->close();

        return $result;
    }

    private function buildFilterClause(string $search, string $status): array
    {
        $conditions = [];
        $types = '';
        $params = [];

        if ($search !== '') {
            $conditions[] = "(f.local LIKE ? OR f.equipamento LIKE ? OR f.tamanho LIKE ? OR f.os LIKE ?)";
            $types .= 'ssss';
            $like = "%{$search}%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        if ($status !== '') {
            $conditions[] = "CASE
                WHEN f.data_proxima_troca IS NULL THEN 'pendente'
                WHEN f.data_proxima_troca <= CURDATE() THEN 'pendente'
                WHEN f.data_proxima_troca <= DATE_ADD(CURDATE(), INTERVAL 2 MONTH) THEN 'planejado'
                ELSE 'concluído'
            END = ?";
            $types .= 's';
            $params[] = $status;
        }

        if (empty($conditions)) {
            return ['1 = 1', $types, $params];
        }

        return [implode(' AND ', $conditions), $types, $params];
    }
}
