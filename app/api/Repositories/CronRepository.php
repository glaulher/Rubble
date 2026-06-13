<?php

namespace App\Api\Repositories;

class CronRepository extends BaseRepository
{
    public function shouldRun(): bool
    {
        $this->conn->query("
            INSERT INTO cron_controle (id, ultima_execucao)
            VALUES (1, NULL)
            ON DUPLICATE KEY UPDATE id = id
        ");

        $result = $this->conn->query(
            "SELECT id FROM cron_controle WHERE DATE(ultima_execucao) = CURDATE() AND id = 1 LIMIT 1"
        );
        if (!$result) {
            throw new \RuntimeException('Erro interno na consulta');
        }
        return $result->num_rows === 0;
    }

    public function updateLastExecution(): void
    {
        $this->conn->query("UPDATE cron_controle SET ultima_execucao = NOW() WHERE id = 1");
    }
}
