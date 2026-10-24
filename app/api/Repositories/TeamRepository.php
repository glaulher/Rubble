<?php

namespace App\Api\Repositories;

class TeamRepository extends BaseRepository
{
    /**
     * List teams ordered by name with pagination.
     */
    public function listAll(int $limit = 9999, int $offset = 0): array
    {
        $stmt = $this->safePrepare(
            'SELECT id, nome, ativo, created_at, updated_at FROM equipes ORDER BY nome ASC LIMIT ? OFFSET ?'
        );
        $stmt->bind_param('ii', $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows   = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    /**
     * Find team by exact name.
     */
    public function findByNameExact(string $name): ?array
    {
        $stmt = $this->safePrepare('SELECT id, nome, ativo FROM equipes WHERE nome = ?');
        $stmt->bind_param('s', $name);
        $stmt->execute();
        $result = $stmt->get_result();
        $row    = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    /**
     * Find team case-insensitively using LOWER.
     */
    public function findByNameCase(string $name): ?array
    {
        $lower = mb_strtolower(trim($name));
        $stmt  = $this->safePrepare('SELECT id, nome, ativo FROM equipes WHERE LOWER(nome) = ?');
        $stmt->bind_param('s', $lower);
        $stmt->execute();
        $result = $stmt->get_result();
        $row    = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    /**
     * Insert new team and return generated id.
     */
    public function save(array $data): int
    {
        $name   = trim($data['nome'] ?? ($data['name'] ?? ''));
        $active = isset($data['ativo']) ? (int) $data['ativo'] : (isset($data['active']) ? (int) $data['active'] : 1);
        $stmt   = $this->safePrepare('INSERT INTO equipes (nome, ativo) VALUES (?, ?)');
        $stmt->bind_param('si', $name, $active);
        $stmt->execute();
        $insertId = (int) $this->conn->insert_id;
        $stmt->close();
        return $insertId;
    }

    /**
     * Update existing team.
     */
    public function update(int $id, array $data): void
    {
        $name   = trim($data['nome'] ?? ($data['name'] ?? ''));
        $active = isset($data['ativo']) ? (int) $data['ativo'] : (isset($data['active']) ? (int) $data['active'] : 1);
        $stmt   = $this->safePrepare('UPDATE equipes SET nome = ?, ativo = ? WHERE id = ?');
        $stmt->bind_param('sii', $name, $active, $id);
        $stmt->execute();
        $stmt->close();
    }

    /**
     * Delete team by id.
     */
    public function delete(int $id): void
    {
        $stmt = $this->safePrepare('DELETE FROM equipes WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
    }

    /**
     * Count total teams.
     */
    public function count(): int
    {
        $stmt   = $this->safePrepare('SELECT COUNT(*) AS total FROM equipes');
        $stmt->execute();
        $result = $stmt->get_result();
        $row    = $result->fetch_assoc();
        $stmt->close();
        return (int) ($row['total'] ?? 0);
    }
}
