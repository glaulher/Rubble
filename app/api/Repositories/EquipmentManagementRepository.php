<?php

namespace App\Api\Repositories;

class EquipmentManagementRepository extends BaseRepository
{
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT e.*, en.local_do_endereco, en.endereco AS endereco_completo, en.uf
             FROM equipamentos e
             LEFT JOIN enderecos en ON en.id = e.endereco_id
             WHERE e.id = ?"
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $stmt->close();
        return $data ?: null;
    }

    public function listAll(?string $search, int $limit, int $offset): array
    {
        if ($search) {
            $like = '%' . $search . '%';
            $stmt = $this->conn->prepare(
                "SELECT e.*, en.local_do_endereco, en.endereco AS endereco_completo, en.uf
                 FROM equipamentos e
                 LEFT JOIN enderecos en ON en.id = e.endereco_id
                 WHERE e.equipamento LIKE ? OR e.local LIKE ? OR e.localidade LIKE ? OR en.local_do_endereco LIKE ?
                 ORDER BY e.local, e.equipamento
                 LIMIT ? OFFSET ?"
            );
            $stmt->bind_param('ssssii', $like, $like, $like, $like, $limit, $offset);
        } else {
            $stmt = $this->conn->prepare(
                "SELECT e.*, en.local_do_endereco, en.endereco AS endereco_completo, en.uf
                 FROM equipamentos e
                 LEFT JOIN enderecos en ON en.id = e.endereco_id
                 ORDER BY e.local, e.equipamento
                 LIMIT ? OFFSET ?"
            );
            $stmt->bind_param('ii', $limit, $offset);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $items = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $items;
    }

    public function count(?string $search): int
    {
        if ($search) {
            $like = '%' . $search . '%';
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) AS total FROM equipamentos e
                 LEFT JOIN enderecos en ON en.id = e.endereco_id
                 WHERE e.equipamento LIKE ? OR e.local LIKE ? OR e.localidade LIKE ? OR en.local_do_endereco LIKE ?"
            );
            $stmt->bind_param('ssss', $like, $like, $like, $like);
        } else {
            $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM equipamentos");
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int)($row['total'] ?? 0);
    }

    public function insert(array $data): int
    {
        $stmt = $this->conn->prepare(
            "INSERT INTO equipamentos (equipamento, capacidade, local, localidade, endereco_id, mercado) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param(
            'sdssis',
            $data['equipamento'],
            $data['capacidade'],
            $data['local'],
            $data['localidade'],
            $data['endereco_id'],
            $data['mercado']
        );
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    public function update(int $id, array $data): void
    {
        $fields = [];
        $types = '';
        $values = [];

        if (isset($data['equipamento'])) {
            $fields[] = 'equipamento = ?';
            $types .= 's';
            $values[] = $data['equipamento'];
        }
        if (array_key_exists('capacidade', $data)) {
            $fields[] = 'capacidade = ?';
            $types .= 'd';
            $values[] = $data['capacidade'] ?? null;
        }
        if (isset($data['local'])) {
            $fields[] = 'local = ?';
            $types .= 's';
            $values[] = $data['local'];
        }
        if (isset($data['localidade'])) {
            $fields[] = 'localidade = ?';
            $types .= 's';
            $values[] = $data['localidade'];
        }
        if (isset($data['endereco_id'])) {
            $fields[] = 'endereco_id = ?';
            $types .= 'i';
            $values[] = $data['endereco_id'];
        }
        if (isset($data['mercado'])) {
            $fields[] = 'mercado = ?';
            $types .= 's';
            $values[] = $data['mercado'];
        }

        if (empty($fields)) {
            return;
        }

        $types .= 'i';
        $values[] = $id;

        $sql = "UPDATE equipamentos SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }

    public function delete(int $id): void
    {
        $stmt = $this->conn->prepare("DELETE FROM equipamentos WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
    }

    public function findOrCreateEndereco(string $localDoEndereco, string $endereco, string $uf): int
    {
        $stmt = $this->conn->prepare(
            "SELECT id FROM enderecos WHERE local_do_endereco = ? AND endereco = ? AND uf = ?"
        );
        $stmt->bind_param('sss', $localDoEndereco, $endereco, $uf);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        if ($row) {
            return (int)$row['id'];
        }

        $stmt = $this->conn->prepare(
            "INSERT INTO enderecos (local_do_endereco, endereco, uf) VALUES (?, ?, ?)"
        );
        $stmt->bind_param('sss', $localDoEndereco, $endereco, $uf);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    public function canDelete(int $id): array
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM registros WHERE equipamento_id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $registros = (int)($result->fetch_assoc()['total'] ?? 0);
        $stmt->close();

        $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM pv WHERE equipamento_id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $pvs = (int)($result->fetch_assoc()['total'] ?? 0);
        $stmt->close();

        return [
            'can_delete' => $registros === 0 && $pvs === 0,
            'registros_count' => $registros,
            'pvs_count' => $pvs,
        ];
    }

    public function getEnderecoId(int $equipmentId): ?int
    {
        $stmt = $this->conn->prepare("SELECT endereco_id FROM equipamentos WHERE id = ?");
        $stmt->bind_param('i', $equipmentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row ? (int)$row['endereco_id'] : null;
    }

    public function cleanupOrphanEndereco(int $enderecoId): void
    {
        $stmt = $this->conn->prepare(
            "DELETE FROM enderecos WHERE id = ? AND NOT EXISTS (SELECT 1 FROM equipamentos WHERE endereco_id = ?)"
        );
        $stmt->bind_param('ii', $enderecoId, $enderecoId);
        $stmt->execute();
        $stmt->close();
    }
}
