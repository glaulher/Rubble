<?php

namespace App\Api\Repositories;

class PreventivaRepository extends BaseRepository
{
    public function create(array $data): int
    {
        $sql = "
            INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs)
            VALUES (?, ?, ?, ?, 'Planejado', ?)
        ";

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'sssss',
            $data['site'],
            $data['data_planejada'],
            $data['ticket'],
            $data['equipe'],
            $data['obs']
        );
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function getById(int $id): ?array
    {
        $sql = "SELECT * FROM atividades_preventivas WHERE id = ? LIMIT 1";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc() ?: null;
    }

    public function updateStatus(int $id, string $status, string $obs): bool
    {
        $sql = "UPDATE atividades_preventivas SET status = ?, obs = ? WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('ssi', $status, $obs, $id);
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM atividades_preventivas WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    public function countBySite(string $local): int
    {
        $sql = "SELECT COUNT(*) AS total FROM equipamentos WHERE local = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('s', $local);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return (int) ($row['total'] ?? 0);
    }
}
