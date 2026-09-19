<?php
declare(strict_types=1);

namespace App\Api\Repositories;

use App\Api\Entities\InventoryItem;
use mysqli;

class InventoryRepository extends BaseRepository
{
    public function __construct(?mysqli $conn = null)
    {
        if ($conn !== null) {
            $this->conn = $conn;
        } else {
            parent::__construct();
        }
    }

    public function list(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = [];
        $params = [];
        $types = '';

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $where[] = '(tecnico_nome LIKE ? OR material_nome LIKE ? OR modelo LIKE ? OR serial LIKE ?)';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $types .= 'ssss';
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['em_posse', 'devolvido'], true)) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
            $types .= 's';
        }

        if (!empty($filters['categoria']) && in_array($filters['categoria'], ['veiculo', 'ferramenta', 'celular_ti', 'equipamento', 'outros'], true)) {
            $where[] = 'categoria = ?';
            $params[] = $filters['categoria'];
            $types .= 's';
        }

        $sql = 'SELECT * FROM inventario';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY id DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            return [];
        }
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = (new InventoryItem($row))->toArray();
        }
        $stmt->close();
        return $items;
    }

    public function count(array $filters = []): int
    {
        $where = [];
        $params = [];
        $types = '';

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $where[] = '(tecnico_nome LIKE ? OR material_nome LIKE ? OR modelo LIKE ? OR serial LIKE ?)';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $types .= 'ssss';
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['em_posse', 'devolvido'], true)) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
            $types .= 's';
        }

        if (!empty($filters['categoria']) && in_array($filters['categoria'], ['veiculo', 'ferramenta', 'celular_ti', 'equipamento', 'outros'], true)) {
            $where[] = 'categoria = ?';
            $params[] = $filters['categoria'];
            $types .= 's';
        }

        $sql = 'SELECT COUNT(*) as total FROM inventario';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            return 0;
        }
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int)($res['total'] ?? 0);
    }

    public function findById(int $id): ?InventoryItem
    {
        $stmt = $this->conn->prepare('SELECT * FROM inventario WHERE id = ?');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $res ? new InventoryItem($res) : null;
    }

    public function create(array $data, ?int $userId): int
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO inventario (categoria, tecnico_nome, material_nome, modelo, serial, data_retirada, data_devolucao, status, observacoes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$stmt) {
            return 0;
        }

        $categoria = $data['categoria'];
        $tecnico = $data['tecnico_nome'];
        $material = $data['material_nome'];
        $modelo = $data['modelo'];
        $serial = $data['serial'];
        $retirada = $data['data_retirada'];
        $devolucao = !empty($data['data_devolucao']) ? $data['data_devolucao'] : null;
        $status = $devolucao ? 'devolvido' : 'em_posse';
        $obs = !empty($data['observacoes']) ? $data['observacoes'] : null;

        $stmt->bind_param('sssssssssi', $categoria, $tecnico, $material, $modelo, $serial, $retirada, $devolucao, $status, $obs, $userId);
        $stmt->execute();
        $newId = (int)$stmt->insert_id;
        $stmt->close();
        return $newId;
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->conn->prepare(
            'UPDATE inventario SET categoria = ?, tecnico_nome = ?, material_nome = ?, modelo = ?, serial = ?, data_retirada = ?, data_devolucao = ?, status = ?, observacoes = ? WHERE id = ?'
        );
        if (!$stmt) {
            return false;
        }

        $categoria = $data['categoria'];
        $tecnico = $data['tecnico_nome'];
        $material = $data['material_nome'];
        $modelo = $data['modelo'];
        $serial = $data['serial'];
        $retirada = $data['data_retirada'];
        $devolucao = !empty($data['data_devolucao']) ? $data['data_devolucao'] : null;
        $status = $devolucao ? 'devolvido' : 'em_posse';
        $obs = !empty($data['observacoes']) ? $data['observacoes'] : null;

        $stmt->bind_param('sssssssssi', $categoria, $tecnico, $material, $modelo, $serial, $retirada, $devolucao, $status, $obs, $id);
        $success = $stmt->execute();
        $stmt->close();
        return $success;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare('DELETE FROM inventario WHERE id = ?');
        if (!$stmt) {
            return false;
        }
        $stmt->bind_param('i', $id);
        $success = $stmt->execute();
        $stmt->close();
        return $success;
    }

    public function getDistinctTechnicians(): array
    {
        $sql = "SELECT DISTINCT tecnico_nome as name FROM inventario WHERE tecnico_nome != ''
                UNION
                SELECT DISTINCT responsavel as name FROM registros WHERE responsavel IS NOT NULL AND responsavel != ''
                ORDER BY name ASC LIMIT 100";
        $result = $this->conn->query($sql);
        if (!$result) {
            return [];
        }
        $list = [];
        while ($row = $result->fetch_assoc()) {
            $list[] = $row['name'];
        }
        return $list;
    }
}
