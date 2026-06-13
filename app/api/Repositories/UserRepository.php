<?php

namespace App\Api\Repositories;

class UserRepository extends BaseRepository
{
    public function getById(int $id): ?array
    {
        $stmt = $this->safePrepare("SELECT id, username, nome, role, created_at FROM usuarios WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();
        return $user ?: null;
    }

    public function listAll(?string $search, int $limit, int $offset): array
    {
        if ($search) {
            $like = '%' . $search . '%';
            $stmt = $this->safePrepare(
                "SELECT id, username, nome, role, created_at FROM usuarios WHERE username LIKE ? OR nome LIKE ? ORDER BY nome ASC LIMIT ? OFFSET ?"
            );
            $stmt->bind_param('ssii', $like, $like, $limit, $offset);
        } else {
            $stmt = $this->safePrepare(
                "SELECT id, username, nome, role, created_at FROM usuarios ORDER BY nome ASC LIMIT ? OFFSET ?"
            );
            $stmt->bind_param('ii', $limit, $offset);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $users = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $users;
    }

    public function count(?string $search): int
    {
        if ($search) {
            $like = '%' . $search . '%';
            $stmt = $this->safePrepare("SELECT COUNT(*) AS total FROM usuarios WHERE username LIKE ? OR nome LIKE ?");
            $stmt->bind_param('ss', $like, $like);
        } else {
            $stmt = $this->safePrepare("SELECT COUNT(*) AS total FROM usuarios");
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return (int)($row['total'] ?? 0);
    }

    public function insert(array $data): int
    {
        $stmt = $this->safePrepare(
            "INSERT INTO usuarios (username, nome, password, role) VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param('ssss', $data['username'], $data['nome'], $data['password'], $data['role']);
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

        if (isset($data['username'])) {
            $fields[] = 'username = ?';
            $types .= 's';
            $values[] = $data['username'];
        }
        if (isset($data['nome'])) {
            $fields[] = 'nome = ?';
            $types .= 's';
            $values[] = $data['nome'];
        }
        if (isset($data['password'])) {
            $fields[] = 'password = ?';
            $types .= 's';
            $values[] = $data['password'];
        }
        if (isset($data['role'])) {
            $fields[] = 'role = ?';
            $types .= 's';
            $values[] = $data['role'];
        }

        if (empty($fields)) {
            return;
        }

        $types .= 'i';
        $values[] = $id;

        $sql = "UPDATE usuarios SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }

    public function delete(int $id): void
    {
        $stmt = $this->safePrepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->safePrepare("SELECT id FROM usuarios WHERE username = ?");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }
}
