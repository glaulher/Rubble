<?php

namespace App\Api\Repositories;

class PreventivaRepository extends BaseRepository
{
    public function create(array $data, string $defaultStatus = 'Planejado'): int
    {
        $hasSla = !empty($data['sla_days']) && (int) $data['sla_days'] > 0;

        if ($hasSla) {
            $sql = "
                INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs,
                    sla_days, sla_include_saturday, sla_include_sunday, sla_day_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->safePrepare($sql);
            $slaDays = (int) $data['sla_days'];
            $includeSat = !empty($data['sla_include_saturday']) ? 1 : 0;
            $includeSun = !empty($data['sla_include_sunday']) ? 1 : 0;
            $dayNumber = (int) ($data['sla_day_number'] ?? 1);
            $stmt->bind_param(
                'ssssssiiii',
                $data['site'],
                $data['data_planejada'],
                $data['ticket'],
                $data['equipe'],
                $defaultStatus,
                $data['obs'],
                $slaDays,
                $includeSat,
                $includeSun,
                $dayNumber
            );
        } else {
            $sql = "
                INSERT INTO atividades_preventivas (site, data_planejada, ticket, equipe, status, obs)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param(
                'ssssss',
                $data['site'],
                $data['data_planejada'],
                $data['ticket'],
                $data['equipe'],
                $defaultStatus,
                $data['obs']
            );
        }
        $stmt->execute();

        return (int) $this->conn->insert_id;
    }

    public function createSlaCard(int $originalId, string $targetDate, int $slaDayNumber): int
    {
        $sql = "
            INSERT INTO atividades_preventivas (site, ticket, data_planejada, equipe, status, obs,
                sla_days, sla_include_saturday, sla_include_sunday, sla_day_number)
            SELECT site, ticket, ?, equipe, 'Planejado', obs,
                   sla_days, sla_include_saturday, sla_include_sunday, ?
            FROM atividades_preventivas
            WHERE id = ?
        ";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sii', $targetDate, $slaDayNumber, $originalId);
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

    public function updateStatus(int $id, string $status, string $obs, ?string $dataPlanejada = null): bool
    {
        if ($dataPlanejada !== null) {
            $sql = "UPDATE atividades_preventivas SET status = ?, obs = ?, data_planejada = ? WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('sssi', $status, $obs, $dataPlanejada, $id);
        } else {
            $sql = "UPDATE atividades_preventivas SET status = ?, obs = ? WHERE id = ?";
            $stmt = $this->safePrepare($sql);
            $stmt->bind_param('ssi', $status, $obs, $id);
        }
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM atividades_preventivas WHERE id = ?";
        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

}
