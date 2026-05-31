<?php

namespace App\Api\Repositories;

use App\Api\Entities\Pv;
use App\Api\Entities\PvItem;

class PvRepository extends BaseRepository
{
    public const LPU_TABLES = [
        'civil_lpu', 'material_clima_lpu', 'material_chiller_lpu',
        'servico_clima_lpu', 'servico_chiller_lpu',
    ];

    public const LPU_ORIGIN_MAP = [
        'lpu_material_clima'   => 'material_clima_lpu',
        'lpu_material_chiller' => 'material_chiller_lpu',
        'lpu_civil'            => 'civil_lpu',
        'lpu_servico_clima'    => 'servico_clima_lpu',
        'lpu_servico_chiller'  => 'servico_chiller_lpu',
    ];

    public const OS_DIR = __DIR__ . '/../../../OS';
    public const LAUDO_DIR = __DIR__ . '/../../../LAUDO';

    private function buildFilterClause(string $search, ?string $status, ?string $cycle): array
    {
        $conditions = [];
        $params = [];
        $types = '';

        if ($search !== '') {
            $conditions[] = "(pv.numero_pv LIKE ? OR pv.local LIKE ? OR pv.ral LIKE ? OR EXISTS (SELECT 1 FROM pv_os po JOIN registros r ON r.id = po.registro_id WHERE po.pv_id = pv.id AND r.os LIKE ?))";
            $param = "%{$search}%";
            $params = [$param, $param, $param, $param];
            $types = 'ssss';
        }

        if ($status !== null && $status !== '') {
            $conditions[] = "pv.status = ?";
            $params[] = $status;
            $types .= 's';
        }

        if ($cycle !== null && $cycle !== '') {
            $conditions[] = "pv.ciclo = ?";
            $params[] = $cycle;
            $types .= 's';
        }

        $where = $conditions ? 'WHERE 1=1 AND ' . implode(' AND ', $conditions) : 'WHERE 1=1';
        return [$where, $types, $params];
    }

    public function count(string $search = '', ?string $status = null, ?string $cycle = null): int
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $cycle);

        $sql = "
            SELECT COUNT(DISTINCT pv.id) as total
            FROM pv
            {$where}
        ";

        $stmt = $this->conn->prepare($sql);

        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        return (int) $result->fetch_assoc()['total'];
    }

    public function listAll(int $limit = 20, int $offset = 0, string $search = '', ?string $status = null, ?string $cycle = null, string $sortBy = 'pv.id', string $sortDir = 'DESC'): array
    {
        $allowedSort = ['pv.numero_pv', 'pv.data', 'pv.local', 'pv.status', 'itens_count', 'valor_total'];
        $sortBy = in_array($sortBy, $allowedSort) ? $sortBy : 'pv.id';
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $sql = "
            SELECT pv.*,
                e.equipamento, e.capacidade, e.localidade, en.uf, en.local_do_endereco,
                COALESCE(SUM(pi.valor_total), 0) as valor_total,
                COUNT(pi.id) as itens_count,
                (SELECT GROUP_CONCAT(r.os ORDER BY r.id SEPARATOR ', ') FROM pv_os po JOIN registros r ON r.id = po.registro_id WHERE po.pv_id = pv.id) as `os`
            FROM pv
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            LEFT JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE 1=1
        ";

        $params = [];
        $types = '';

        if ($search !== '') {
            $sql .= " AND (
                pv.numero_pv LIKE ?
                OR pv.local LIKE ?
                OR pv.ral LIKE ?
                OR EXISTS (SELECT 1 FROM pv_os po JOIN registros r ON r.id = po.registro_id WHERE po.pv_id = pv.id AND r.os LIKE ?)
                OR pi.scm LIKE ?
            )";
            $param = "%{$search}%";
            $params = [$param, $param, $param, $param, $param];
            $types = 'sssss';
        }

        if ($status !== null && $status !== '') {
            $sql .= " AND pv.status = ?";
            $params[] = $status;
            $types .= 's';
        }

        if ($cycle !== null && $cycle !== '') {
            $sql .= " AND pv.ciclo = ?";
            $params[] = $cycle;
            $types .= 's';
        }

        $sql .= "
            GROUP BY pv.id
            ORDER BY {$sortBy} {$sortDir}
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = new Pv($row);
        }

        return $items;
    }

    public function getTotalValue(string $search = '', ?string $status = null, ?string $cycle = null): float
    {
        [$where, $types, $params] = $this->buildFilterClause($search, $status, $cycle);

        $sql = "
            SELECT COALESCE(SUM(pi.valor_total), 0) as total_valor
            FROM pv
            LEFT JOIN pv_item pi ON pi.pv_id = pv.id
            {$where}
        ";

        $stmt = $this->conn->prepare($sql);

        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        return (float) $result->fetch_assoc()['total_valor'];
    }

    public function getById(int $id): ?Pv
    {
        $sql = "
            SELECT pv.*, e.equipamento, e.capacidade, e.localidade, en.uf, en.local_do_endereco
            FROM pv
            LEFT JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE pv.id = ?
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        if (!$row) {
            return null;
        }

        $pv = new Pv($row);
        $pv->items = $this->getItemsByPvId($id);
        $pv->tickets = $this->loadOsLinks($id);

        return $pv;
    }

    public function getByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

        $sql = "
            SELECT pv.*, e.equipamento, e.capacidade, e.localidade, en.uf, en.local_do_endereco
            FROM pv
            LEFT JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE pv.id IN ($placeholders)
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $result = $stmt->get_result();

        $pvs = [];
        $pvMap = [];
        while ($row = $result->fetch_assoc()) {
            $pv = new Pv($row);
            $pvId = (int) $row['id'];
            $pvMap[$pvId] = $pv;
            $pvs[] = $pv;
        }

        if (empty($pvs)) {
            return [];
        }

        // Load items in batch
        $allItems = $this->getItemsByPvIds(array_keys($pvMap));
        foreach ($pvMap as $pvId => $pv) {
            $pv->items = array_map(
                fn(array $itemData) => new PvItem($itemData),
                $allItems[$pvId] ?? []
            );
        }

        // Load tickets in batch
        $allTickets = $this->loadOsLinksBatch(array_keys($pvMap));
        foreach ($pvMap as $pvId => $pv) {
            $pv->tickets = $allTickets[$pvId] ?? [];
        }

        return $pvs;
    }

    public function getByNumberPv(string $numberPv): ?Pv
    {
        $sql = "
            SELECT pv.*, e.equipamento, e.capacidade, e.localidade, en.uf, en.local_do_endereco
            FROM pv
            LEFT JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE pv.numero_pv = ?
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $numberPv);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        if (!$row) {
            return null;
        }

        $pv = new Pv($row);
        $pv->items = $this->getItemsByPvId((int) $row['id']);
        $pv->tickets = $this->loadOsLinks((int) $row['id']);

        return $pv;
    }

    public function getItemsByPvId(int $pvId): array
    {
        $sql = "
            SELECT *
            FROM pv_item
            WHERE pv_id = ?
            ORDER BY id ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $pvId);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = new PvItem($row);
        }

        return $items;
    }

    public function getItemsByPvIds(array $pvIds): array
    {
        if (empty($pvIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($pvIds), '?'));
        $types = str_repeat('i', count($pvIds));

        $sql = "
            SELECT pi.*, pv.numero_pv
            FROM pv_item pi
            JOIN pv ON pv.id = pi.pv_id
            WHERE pi.pv_id IN ($placeholders)
            ORDER BY pi.pv_id, pi.id
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$pvIds);
        $stmt->execute();
        $result = $stmt->get_result();

        $grouped = [];
        while ($row = $result->fetch_assoc()) {
            $pid = (int) $row['pv_id'];
            $grouped[$pid][] = (new PvItem($row))->toArray();
        }

        return $grouped;
    }

    public function getMaxNumberPv(string $yearPrefix): ?string
    {
        $sql = "
            SELECT MAX(numero_pv) as max_num
            FROM pv
            WHERE numero_pv LIKE ?
        ";

        $stmt = $this->conn->prepare($sql);
        $param = "{$yearPrefix}%";
        $stmt->bind_param('s', $param);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row['max_num'] ?? null;
    }

    public function lookupLpuItem(string $table, int $itemNumber): ?array
    {
        if (!in_array($table, self::LPU_TABLES, true)) {
            return null;
        }

        $sql = "
            SELECT descricao, valor
            FROM {$table}
            WHERE numero_item = ?
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $itemNumber);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ?: null;
    }

    public function save(array $data): int
    {
        $sql = "
            INSERT INTO pv (
                numero_pv, `data`, ciclo, local, status, ral,
                equipamento_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->conn->prepare($sql);
        $vNumberPv = $data['numero_pv'];
        $vDate = $data['data'] ?? null;
        $vCycle = $data['ciclo'] ?? null;
        $vLocation = $data['local'];
        $vStatus = $data['status'];
        $vRal = $data['ral'] ?? null;
        $vEquipmentId = (int) $data['equipamento_id'];
        $stmt->bind_param(
            'ssssssi',
            $vNumberPv,
            $vDate,
            $vCycle,
            $vLocation,
            $vStatus,
            $vRal,
            $vEquipmentId
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function saveItem(array $data): int
    {
        $sql = "
            INSERT INTO pv_item (
                pv_id, lpu_origem, descricao_lpu, descricao, numero_item,
                quantidade, valor, valor_total, bdi, valor_flpu,
                fatura, scm, laudo, filtro_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->conn->prepare($sql);
        $filtroData = $data['filtro_data'] ?? null;
        $stmt->bind_param(
            'isssidddddssss',
            $data['pv_id'],
            $data['lpu_origem'],
            $data['descricao_lpu'],
            $data['descricao'],
            $data['numero_item'],
            $data['quantidade'],
            $data['valor'],
            $data['valor_total'],
            $data['bdi'],
            $data['valor_flpu'],
            $data['fatura'],
            $data['scm'],
            $data['laudo'],
            $filtroData
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function deleteItemsByPvId(int $pvId): bool
    {
        $sql = "DELETE FROM pv_item WHERE pv_id = ?";
        $stmt = $this->conn->prepare($sql);
        return $stmt->bind_param('i', $pvId) && $stmt->execute();
    }

    public function update(array $data): bool
    {
        $sql = "
            UPDATE pv
            SET `data` = ?, ciclo = ?, local = ?, status = ?, ral = ?,
                equipamento_id = ?
            WHERE id = ?
        ";

        $stmt = $this->conn->prepare($sql);
        $vDate = $data['data'] ?? null;
        $vCycle = $data['ciclo'] ?? null;
        $vLocation = $data['local'];
        $vStatus = $data['status'];
        $vRal = $data['ral'] ?? null;
        $vEquipmentId = (int) $data['equipamento_id'];
        $vId = $data['id'];
        return $stmt->bind_param(
            'sssssii',
            $vDate,
            $vCycle,
            $vLocation,
            $vStatus,
            $vRal,
            $vEquipmentId,
            $vId
        ) && $stmt->execute();
    }

    public function updateStatus(int $id, string $status): bool
    {
        $sql = "UPDATE pv SET status = ? WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        return $stmt->bind_param('si', $status, $id) && $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM pv WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    public function searchLpuItems(string $table, string $query, int $limit = 20): array
    {
        if (!in_array($table, self::LPU_TABLES, true)) {
            return [];
        }

        $sql = "
            SELECT numero_item, descricao, valor
            FROM {$table}
            WHERE descricao LIKE ?
            ORDER BY numero_item
            LIMIT ?
        ";

        $stmt = $this->conn->prepare($sql);
        $param = "%{$query}%";
        $stmt->bind_param('si', $param, $limit);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }

        return $items;
    }

    public function listLocations(): array
    {
        $sql = "SELECT DISTINCT local FROM equipamentos ORDER BY local";
        $result = $this->conn->query($sql);

        $locals = [];
        while ($row = $result->fetch_assoc()) {
            $locals[] = $row['local'];
        }

        return $locals;
    }

    public function saveOsLinks(int $pvId, array $ticketIds): void
    {
        $sql = "INSERT IGNORE INTO pv_os (pv_id, registro_id) VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);

        foreach ($ticketIds as $ticketId) {
            $ticketId = (int) $ticketId;
            if ($ticketId <= 0) continue;
            $stmt->bind_param('ii', $pvId, $ticketId);
            $stmt->execute();
        }
    }

    public function deleteOsLinks(int $pvId): void
    {
        $sql = "DELETE FROM pv_os WHERE pv_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $pvId);
        $stmt->execute();
    }

    public function loadOsLinks(int $pvId): array
    {
        $sql = "
            SELECT r.*
            FROM pv_os po
            JOIN registros r ON r.id = po.registro_id
            WHERE po.pv_id = ?
            ORDER BY r.id
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $pvId);
        $stmt->execute();
        $result = $stmt->get_result();

        $tickets = [];
        while ($row = $result->fetch_assoc()) {
            $tickets[] = $row;
        }

        return $tickets;
    }

    public function loadOsLinksBatch(array $pvIds): array
    {
        if (empty($pvIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($pvIds), '?'));
        $types = str_repeat('i', count($pvIds));

        $sql = "
            SELECT po.pv_id, r.*
            FROM pv_os po
            JOIN registros r ON r.id = po.registro_id
            WHERE po.pv_id IN ($placeholders)
            ORDER BY po.pv_id, r.id
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$pvIds);
        $stmt->execute();
        $result = $stmt->get_result();

        $grouped = [];
        while ($row = $result->fetch_assoc()) {
            $pid = (int) $row['pv_id'];
            $grouped[$pid][] = $row;
        }

        return $grouped;
    }

    public function lookupTicketByOs(string $osNumber): ?array
    {
        $sql = "
            SELECT id, os
            FROM registros
            WHERE os = ?
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $osNumber);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row ?: null;
    }

    public function searchTicketsByOs(string $query, int $limit = 20): array
    {
        $sql = "
            SELECT id, os, data, equipamento_id
            FROM registros
            WHERE os LIKE ?
            ORDER BY id DESC
            LIMIT ?
        ";

        $stmt = $this->conn->prepare($sql);
        $param = "%{$query}%";
        $stmt->bind_param('si', $param, $limit);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }

        return $items;
    }

    public function getEquipmentIdByName(string $name): ?int
    {
        $stmt = $this->conn->prepare(
            "SELECT id FROM equipamentos WHERE equipamento = ? LIMIT 1"
        );
        $stmt->bind_param('s', $name);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row ? (int) $row['id'] : null;
    }

    public function getListByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

        $sql = "
            SELECT pv.id, pv.numero_pv, pv.local, en.uf, en.local_do_endereco,
                   (SELECT GROUP_CONCAT(r.os ORDER BY r.id SEPARATOR ', ')
                    FROM pv_os po JOIN registros r ON r.id = po.registro_id WHERE po.pv_id = pv.id) as `os`
            FROM pv
            LEFT JOIN equipamentos e ON e.id = pv.equipamento_id
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE pv.id IN ($placeholders)
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }

        return $items;
    }
}
