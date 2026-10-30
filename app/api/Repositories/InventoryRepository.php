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
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int) ($row['total'] ?? 0);
    }

    public function countEmPosse(): int
    {
        $res = $this->conn->query("SELECT COUNT(*) as total FROM inventario WHERE status = 'em_posse'");
        if (!$res) {
            return 0;
        }
        $row = $res->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }

    public function findActiveBySerial(string $serial): ?InventoryItem
    {
        $serial = trim($serial);
        if ($serial === '') {
            return null;
        }
        $stmt = $this->conn->prepare("SELECT * FROM inventario WHERE serial = ? AND status = 'em_posse' ORDER BY id DESC LIMIT 1");
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('s', $serial);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $res ? new InventoryItem($res) : null;
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

    public function transferAndCloneItem(int $oldId, string $novoTecnico, string $termoRef, ?int $userId = null): ?int
    {
        $oldItem = $this->findById($oldId);
        if (!$oldItem) {
            return null;
        }

        $today = date('Y-m-d');
        $antigoTecnico = $oldItem->tecnicoNome;

        // 1. Fechar linha anterior: data_devolucao = hoje, status = 'devolvido'
        $stmtClose = $this->conn->prepare(
            "UPDATE inventario 
             SET data_devolucao = ?, status = 'devolvido',
                 observacoes = CONCAT(COALESCE(observacoes, ''), '\n', ?)
             WHERE id = ?"
        );
        if (!$stmtClose) {
            return null;
        }
        $noteClose = "[Transferido para {$novoTecnico} via Termo {$termoRef} em {$today}]";
        $stmtClose->bind_param('ssi', $today, $noteClose, $oldId);
        $stmtClose->execute();
        $stmtClose->close();

        // 2. Abrir nova linha: dados clonados, novo técnico, data_retirada = hoje, status = 'em_posse'
        $stmtNew = $this->conn->prepare(
            "INSERT INTO inventario 
             (categoria, tecnico_nome, material_nome, modelo, serial, data_retirada, data_devolucao, status, observacoes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, NULL, 'em_posse', ?, ?)"
        );
        if (!$stmtNew) {
            return null;
        }
        $noteNew = "[Transferência de {$antigoTecnico} via Termo {$termoRef} em {$today}]";
        $categoria = $oldItem->categoria;
        $materialNome = $oldItem->materialNome;
        $modelo = $oldItem->modelo;
        $serial = $oldItem->serial;
        $createdBy = $userId ?? $oldItem->createdBy;

        $stmtNew->bind_param('sssssssi', $categoria, $novoTecnico, $materialNome, $modelo, $serial, $today, $noteNew, $createdBy);
        $stmtNew->execute();
        $newId = (int) $stmtNew->insert_id;
        $stmtNew->close();

        return $newId > 0 ? $newId : null;
    }

    public function transferCustody(int $id, string $novoTecnico, string $dataRetirada, string $termoRef): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE inventario 
             SET tecnico_nome = ?, data_retirada = ?, data_devolucao = NULL, status = 'em_posse',
                 observacoes = CONCAT(COALESCE(observacoes, ''), '\n', ?)
             WHERE id = ?"
        );
        if (!$stmt) {
            return false;
        }
        $note = "[Transferência via Termo {$termoRef} em {$dataRetirada}]";
        $stmt->bind_param('sssi', $novoTecnico, $dataRetirada, $note, $id);
        $res = $stmt->execute();
        $stmt->close();
        return $res;
    }

    public function markReturned(int $id, string $dataDevolucao, ?string $obs = null): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE inventario 
             SET data_devolucao = ?, status = 'devolvido',
                 observacoes = CONCAT(COALESCE(observacoes, ''), '\n', ?)
             WHERE id = ?"
        );
        if (!$stmt) {
            return false;
        }
        $note = $obs ? "[Devolução em {$dataDevolucao}: {$obs}]" : "[Devolução registrada em {$dataDevolucao}]";
        $stmt->bind_param('ssi', $dataDevolucao, $note, $id);
        $res = $stmt->execute();
        $stmt->close();
        return $res;
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
