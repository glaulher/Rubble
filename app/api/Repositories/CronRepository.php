<?php

namespace App\Api\Repositories;

class CronRepository extends BaseRepository
{
    public function shouldRun(): bool
    {
        $stmt = $this->safePrepare("
            INSERT INTO cron_controle (id, ultima_execucao)
            VALUES (1, NULL)
            ON DUPLICATE KEY UPDATE id = id
        ");
        $stmt->execute();
        $stmt->close();

        $stmt = $this->safePrepare(
            "SELECT id FROM cron_controle WHERE DATE(ultima_execucao) = CURDATE() AND id = 1 LIMIT 1"
        );
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows === 0;
    }

    public function updateLastExecution(): void
    {
        $stmt = $this->safePrepare("UPDATE cron_controle SET ultima_execucao = NOW() WHERE id = 1");
        $stmt->execute();
    }
}
