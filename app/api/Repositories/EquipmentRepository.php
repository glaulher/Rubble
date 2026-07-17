<?php

namespace App\Api\Repositories;

use App\Api\Entities\Equipment;

class EquipmentRepository extends BaseRepository
{

    private function buildFilterClause(string $search, ?string $location, ?string $exactName = null): array
    {
        $conditions = [];
        $params = [];
        $types = '';

        if ($exactName !== null) {
            $conditions[] = "e.equipamento = ?";
            $params[] = $exactName;
            $types .= 's';
            return [$conditions, $types, $params];
        }

        $conditions[] = "e.equipamento != 'N/A'";

        if ($location !== null && $location !== '') {
            $conditions[] = "e.local = ?";
            $params[] = $location;
            $types .= 's';
        }

        if ($search !== '') {
            if (mb_strlen($search) >= 3) {
                $fulltextTerms = '+' . implode(' +*', preg_split('/\s+/', trim($search)));
                $conditions[] = "(
                    MATCH(e.local, e.equipamento, e.localidade) AGAINST(? IN BOOLEAN MODE)
                    OR e.local_scm LIKE ?
                    OR en.local_do_endereco LIKE ?
                    OR en.endereco LIKE ?
                    OR EXISTS (
                        SELECT 1
                        FROM registros r
                        WHERE r.equipamento_id = e.id
                        AND (
                            r.status LIKE ?
                            OR r.obs LIKE ?
                            OR r.material LIKE ?
                            OR r.os LIKE ?
                        )
                    )
                )";
                $param = "%{$search}%";
                $params = array_merge($params, [$fulltextTerms, $param, $param, $param, $param, $param, $param, $param]);
                $types .= 'ssssssss';
            } else {
                $conditions[] = "(
                    e.local LIKE ?
                    OR e.local_scm LIKE ?
                    OR e.equipamento LIKE ?
                    OR en.local_do_endereco LIKE ?
                    OR en.endereco LIKE ?
                    OR EXISTS (
                        SELECT 1
                        FROM registros r
                        WHERE r.equipamento_id = e.id
                        AND (
                            r.status LIKE ?
                            OR r.obs LIKE ?
                            OR r.material LIKE ?
                            OR r.os LIKE ?
                        )
                    )
                )";
                $param = "%{$search}%";
                $params = array_merge($params, [$param, $param, $param, $param, $param, $param, $param, $param, $param]);
                $types .= 'sssssssss';
            }
        }

        return [$conditions, $types, $params];
    }

    public function count(string $search = '', ?string $location = null, ?string $exactName = null): int
    {
        [$conditions, $types, $params] = $this->buildFilterClause($search, $location, $exactName);

        $sql = "
            SELECT COUNT(*) as total
            FROM equipamentos e
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE " . implode(" AND ", $conditions);

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        return (int) $result->fetch_assoc()['total'];
    }

    public function countOS(string $search = ''): int
    {
        if ($search === '') {
            return 0;
        }

        $param = "%{$search}%";
        $sql = "
            SELECT COUNT(*) as total
            FROM registros r
            JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE (
                e.local LIKE ?
                OR e.local_scm LIKE ?
                OR e.equipamento LIKE ?
                OR en.local_do_endereco LIKE ?
                OR en.endereco LIKE ?
                OR r.status LIKE ?
                OR r.obs LIKE ?
                OR r.material LIKE ?
                OR r.os LIKE ?
            )
        ";

        $stmt = $this->safePrepare($sql);
        $types = 'sssssssss';
        $stmt->bind_param($types, $param, $param, $param, $param, $param, $param, $param, $param, $param);
        $stmt->execute();
        return (int) $stmt->get_result()->fetch_assoc()['total'];
    }

    public function listAll(int $limit = 20, ?array $keyset = null, string $search = '', ?string $location = null, ?string $exactName = null): array
    {
        [$conditions, $types, $params] = $this->buildFilterClause($search, $location, $exactName);

        if ($keyset !== null) {
            $conditions[] = "(e.local, e.equipamento, e.id) > (?, ?, ?)";
            $params[] = $keyset['local'];
            $params[] = $keyset['equipamento'];
            $params[] = $keyset['id'];
            $types .= 'ssi';
        }

        $sql = "
            SELECT
                e.*,
                en.local_do_endereco,
                en.endereco
            FROM equipamentos e
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE " . implode(" AND ", $conditions) . "
            ORDER BY e.local, e.equipamento, e.id
            LIMIT ?
        ";

        $params[] = $limit;
        $types .= 'i';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();

        $equipments = [];
        while ($row = $result->fetch_assoc()) {
            $equipments[] = new Equipment($row);
        }

        return $equipments;
    }

    public function loadAddress(int $equipmentId): ?array
    {
        $sql = "
            SELECT en.local_do_endereco, en.endereco, en.uf
            FROM equipamentos e
            LEFT JOIN enderecos en ON en.id = e.endereco_id
            WHERE e.id = ?
            LIMIT 1
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $equipmentId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return $row ?: null;
    }

    public function hasChiller(string $location): bool
    {
        $sql = "
            SELECT COUNT(*)
            FROM equipamentos
            WHERE local = ?
            AND LOWER(equipamento) LIKE '%chiller%'
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $location);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_row();

        return (int) $row[0] > 0;
    }

    public function getPendingPvCountByEquipmentIds(array $ids, string $excludedStatus = 'SCM aprovado'): array
    {
        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));
        $excludedStatus = addslashes($excludedStatus);

        $sql = "
            SELECT pv.equipamento_id, COUNT(*) as total,
                GROUP_CONCAT(
                    CONCAT(pv.numero_pv, '|', COALESCE(os_list.os_numbers, ''))
                    ORDER BY pv.numero_pv SEPARATOR ', '
                ) as pvs
            FROM pv
            LEFT JOIN (
                SELECT po.pv_id, GROUP_CONCAT(r.os ORDER BY r.os SEPARATOR ',') as os_numbers
                FROM pv_os po
                JOIN registros r ON r.id = po.registro_id
                GROUP BY po.pv_id
            ) os_list ON os_list.pv_id = pv.id
            WHERE pv.equipamento_id IN ({$placeholders})
            AND EXISTS (SELECT 1 FROM pv_item pi WHERE pi.pv_id = pv.id AND pi.status != '{$excludedStatus}')
            GROUP BY pv.equipamento_id
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $result = $stmt->get_result();

        $map = [];
        while ($row = $result->fetch_assoc()) {
            $map[(int) $row['equipamento_id']] = [
                'total' => (int) $row['total'],
                'pvs' => $row['pvs'],
            ];
        }

        return $map;
    }

    public function findByInfratel(string $site, string $tag): ?Equipment
    {
        $sql = "SELECT * FROM equipamentos WHERE site_infratel = ? AND tag_infratel = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ss', $site, $tag);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row ? new Equipment($row) : null;
    }

    public function listByLocal(string $localCode): array
    {
        $sql = "SELECT * FROM equipamentos WHERE local = ? ORDER BY equipamento";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $localCode);
        $stmt->execute();
        $result = $stmt->get_result();

        $equipments = [];
        while ($row = $result->fetch_assoc()) {
            $equipments[] = new Equipment($row);
        }

        return $equipments;
    }

    public function listByLocalLike(string $localCode): array
    {
        $sql = "SELECT * FROM equipamentos WHERE local LIKE CONCAT('%', ?, '%') ORDER BY equipamento";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $localCode);
        $stmt->execute();
        $result = $stmt->get_result();

        $equipments = [];
        while ($row = $result->fetch_assoc()) {
            $equipments[] = new Equipment($row);
        }

        return $equipments;
    }
}
