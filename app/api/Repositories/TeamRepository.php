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
            'SELECT id, nome, tecnico, placa, veiculo, contrato, ativo, created_at, updated_at FROM equipes ORDER BY nome ASC LIMIT ? OFFSET ?'
        );
        $stmt->bind_param('ii', $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows   = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    /**
     * Find team by id.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->safePrepare('SELECT id, nome, tecnico, placa, veiculo, contrato, ativo, created_at, updated_at FROM equipes WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row    = $result->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    /**
     * Find team by exact name.
     */
    public function findByNameExact(string $name): ?array
    {
        $stmt = $this->safePrepare('SELECT id, nome, tecnico, placa, veiculo, contrato, ativo FROM equipes WHERE nome = ?');
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
        $stmt  = $this->safePrepare('SELECT id, nome, tecnico, placa, veiculo, contrato, ativo FROM equipes WHERE LOWER(nome) = ?');
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
        $name     = trim($data['nome'] ?? ($data['name'] ?? ''));
        $tecnico  = isset($data['tecnico']) && trim((string) $data['tecnico']) !== '' ? trim((string) $data['tecnico']) : null;
        $placa    = isset($data['placa']) && trim((string) $data['placa']) !== '' ? mb_strtoupper(trim((string) $data['placa'])) : null;
        $veiculo  = isset($data['veiculo']) && trim((string) $data['veiculo']) !== '' ? trim((string) $data['veiculo']) : null;
        $contrato = isset($data['contrato']) && trim((string) $data['contrato']) !== '' ? trim((string) $data['contrato']) : null;
        $active   = isset($data['ativo']) ? (int) $data['ativo'] : (isset($data['active']) ? (int) $data['active'] : 1);

        $stmt = $this->safePrepare('INSERT INTO equipes (nome, tecnico, placa, veiculo, contrato, ativo) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->bind_param('sssssi', $name, $tecnico, $placa, $veiculo, $contrato, $active);
        $stmt->execute();
        $insertId = isset($this->conn) ? (int) $this->conn->insert_id : 0;
        $stmt->close();
        return $insertId;
    }

    /**
     * Update existing team.
     */
    public function update(int $id, array $data): void
    {
        $name     = trim($data['nome'] ?? ($data['name'] ?? ''));
        $tecnico  = isset($data['tecnico']) && trim((string) $data['tecnico']) !== '' ? trim((string) $data['tecnico']) : null;
        $placa    = isset($data['placa']) && trim((string) $data['placa']) !== '' ? mb_strtoupper(trim((string) $data['placa'])) : null;
        $veiculo  = isset($data['veiculo']) && trim((string) $data['veiculo']) !== '' ? trim((string) $data['veiculo']) : null;
        $contrato = isset($data['contrato']) && trim((string) $data['contrato']) !== '' ? trim((string) $data['contrato']) : null;
        $active   = isset($data['ativo']) ? (int) $data['ativo'] : (isset($data['active']) ? (int) $data['active'] : 1);

        $stmt = $this->safePrepare('UPDATE equipes SET nome = ?, tecnico = ?, placa = ?, veiculo = ?, contrato = ?, ativo = ? WHERE id = ?');
        $stmt->bind_param('sssssii', $name, $tecnico, $placa, $veiculo, $contrato, $active, $id);
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

    /**
     * Get active teams with valid technicians (excluding vacancies / EM CONTRATAÇÃO).
     */
    public function getActiveTeamsWithTechnicians(): array
    {
        $stmt = $this->safePrepare(
            "SELECT id, nome, tecnico, placa, veiculo, contrato
             FROM equipes
             WHERE ativo = 1
               AND tecnico IS NOT NULL
               AND TRIM(tecnico) != ''
               AND UPPER(TRIM(tecnico)) != 'EM CONTRATAÇÃO'
             ORDER BY nome ASC"
        );
        $stmt->execute();
        $result = $stmt->get_result();
        $rows   = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
