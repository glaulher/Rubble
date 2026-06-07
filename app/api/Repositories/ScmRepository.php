<?php

namespace App\Api\Repositories;

use App\Config\Database;

class ScmRepository extends BaseRepository
{
    public function __construct()
    {
        $this->conn = Database::connect();
    }

    public function listAll(int $limit, int $offset, string $search = '', ?string $dateFrom = null, ?string $dateTo = null, array $segments = [], ?string $status = null): array
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $dateFrom, $dateTo, $segments, $status);

        $sql = "SELECT s.*, 
                       e.equipamento, e.capacidade, e.local, e.localidade, e.mercado,
                       pv.numero_pv,
                       (SELECT COALESCE(SUM(si.subtotal_execucao), 0) FROM scm_items si WHERE si.scm_id = s.id) as total_valor
                FROM scm s
                LEFT JOIN equipamentos e ON e.id = s.equipamento_id
                LEFT JOIN pv_item pi ON pi.scm = s.scm
                LEFT JOIN pv ON pv.id = pi.pv_id
                {$where}
                GROUP BY s.id
                ORDER BY s.scm DESC
                LIMIT ? OFFSET ?";

        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->conn->prepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        return $items;
    }

    public function count(string $search = '', ?string $dateFrom = null, ?string $dateTo = null, array $segments = [], ?string $status = null): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $dateFrom, $dateTo, $segments, $status);

        $sql = "SELECT COUNT(*) as total FROM scm s
                LEFT JOIN equipamentos e ON e.id = s.equipamento_id
                {$where}";

        $stmt = $this->conn->prepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        return (int) $stmt->get_result()->fetch_assoc()['total'];
    }

    public function getTotalValue(string $search = '', ?string $dateFrom = null, ?string $dateTo = null, array $segments = [], ?string $status = null): float
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $dateFrom, $dateTo, $segments, $status);

        $sql = "SELECT COALESCE(SUM(si.subtotal_execucao), 0) as total_valor 
                FROM scm s
                LEFT JOIN scm_items si ON si.scm_id = s.id
                LEFT JOIN equipamentos e ON e.id = s.equipamento_id
                {$where}";

        $stmt = $this->conn->prepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        return (float) $stmt->get_result()->fetch_assoc()['total_valor'];
    }

    public function getById(int $id): ?array
    {
        $sql = "SELECT s.*, 
                       e.equipamento, e.capacidade, e.local, e.localidade, e.mercado
                FROM scm s
                LEFT JOIN equipamentos e ON e.id = s.equipamento_id
                WHERE s.id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) return null;

        $scm = $result->fetch_assoc();
        $scm['items'] = $this->getItems($id);
        return $scm;
    }

    public function getItems(int $scmId): array
    {
        $sql = "SELECT * FROM scm_items WHERE scm_id = ? ORDER BY id ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $scmId);
        $stmt->execute();
        $result = $stmt->get_result();
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        return $items;
    }

    public function findByScmCode(string $scm): ?array
    {
        $sql = "SELECT * FROM scm WHERE scm = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $scm);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
    }

    public function upsert(array $data): bool
    {
        $sql = "INSERT INTO scm (scm, data, atividade, site, cidade, abertura, status,
                    data_execucao, data_validacao, medicao, origem, segmento, obs, equipamento_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    data = VALUES(data),
                    atividade = VALUES(atividade),
                    site = VALUES(site),
                    cidade = VALUES(cidade),
                    abertura = VALUES(abertura),
                    status = VALUES(status),
                    data_execucao = VALUES(data_execucao),
                    data_validacao = VALUES(data_validacao),
                    medicao = VALUES(medicao),
                    origem = VALUES(origem),
                    segmento = VALUES(segmento),
                    obs = VALUES(obs),
                    equipamento_id = VALUES(equipamento_id)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('sssssssssssssi',
            $data['scm'], $data['data'], $data['atividade'], $data['site'],
            $data['cidade'], $data['abertura'], $data['status'],
            $data['data_execucao'], $data['data_validacao'], $data['medicao'],
            $data['origem'], $data['segmento'], $data['obs'], $data['equipamento_id']
        );
        return $stmt->execute();
    }

    public function upsertItems(int $scmId, array $items): bool
    {
        $sqlDelete = "DELETE FROM scm_items WHERE scm_id = ?";
        $stmtDelete = $this->conn->prepare($sqlDelete);
        $stmtDelete->bind_param('i', $scmId);
        $stmtDelete->execute();

        if (empty($items)) return true;

        $sql = "INSERT INTO scm_items (scm_id, servico, unidade, valor, qtde_execucao, subtotal_execucao)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);

        foreach ($items as $item) {
            $servico = $item['servico'];
            $unidade = $item['unidade'];
            $valor = $item['valor'];
            $qtde = $item['qtde_execucao'];
            $subtotal = $item['subtotal_execucao'];
            $stmt->bind_param('issddd', $scmId, $servico, $unidade, $valor, $qtde, $subtotal);
            if (!$stmt->execute()) {
                return false;
            }
        }
        return true;
    }

    public function resolveEquipmentId(string $site): ?int
    {
        $sql = "SELECT id FROM equipamentos WHERE local_scm = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $site);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            return (int) $result->fetch_assoc()['id'];
        }

        $sql = "SELECT e.id FROM equipamentos e
                JOIN enderecos en ON en.id = e.endereco_id
                WHERE en.local_do_endereco LIKE ?
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $like = "%{$site}%";
        $stmt->bind_param('s', $like);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            return (int) $result->fetch_assoc()['id'];
        }

        return null;
    }

    public function segments(): array
    {
        $sql = "SELECT DISTINCT segmento FROM scm
                WHERE segmento IS NOT NULL AND segmento != ''
                ORDER BY segmento";
        $result = $this->conn->query($sql);
        $segments = [];
        while ($row = $result->fetch_assoc()) {
            $segments[] = $row['segmento'];
        }
        return $segments;
    }

    public function updatePvItemStatusByScm(string $scmCode, string $status): int
    {
        $sql = "UPDATE pv_item SET status = ? WHERE scm = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ss', $status, $scmCode);
        $stmt->execute();
        return $stmt->affected_rows;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM scm WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    private function buildFilterClause(string $search, ?string $dateFrom = null, ?string $dateTo = null, array $segments = [], ?string $status = null): array
    {
        $conditions = [];
        $types = '';
        $params = [];

        if ($search !== '') {
            $conditions[] = "(s.scm LIKE ? OR s.site LIKE ? OR s.cidade LIKE ?
                OR s.atividade LIKE ? OR s.obs LIKE ?
                OR s.origem LIKE ? OR s.segmento LIKE ? OR e.mercado LIKE ?)";
            $like = "%{$search}%";
            $params = array_merge($params, [$like, $like, $like, $like, $like, $like, $like, $like]);
            $types .= str_repeat('s', 8);
        }

        if ($dateFrom !== null && $dateFrom !== '') {
            $conditions[] = 's.data >= ?';
            $params[] = $dateFrom;
            $types .= 's';
        }

        if ($dateTo !== null && $dateTo !== '') {
            $conditions[] = 's.data <= ?';
            $params[] = $dateTo;
            $types .= 's';
        }

        if (!empty($segments)) {
            $placeholders = implode(',', array_fill(0, count($segments), '?'));
            $conditions[] = "s.segmento IN ({$placeholders})";
            $params = array_merge($params, array_values($segments));
            $types .= str_repeat('s', count($segments));
        }

        if ($status !== null && $status !== '') {
            $conditions[] = 's.status = ?';
            $params[] = $status;
            $types .= 's';
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$where, $types, $params];
    }
}
