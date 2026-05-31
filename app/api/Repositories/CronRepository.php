<?php

namespace App\Api\Repositories;

class CronRepository extends BaseRepository
{
    public function shouldRun(): bool
    {
        $result = $this->conn->query(
            "SELECT id FROM cron_controle WHERE DATE(ultima_execucao) = CURDATE() LIMIT 1"
        );
        if (!$result) {
            error_log('CronRepository shouldRun error: ' . $this->conn->error);
            throw new \RuntimeException(
                'Erro interno na consulta'
            );
        }

        if ($result->num_rows > 0) {
            return false;
        }

        $this->conn->query("
            INSERT INTO cron_controle (id, ultima_execucao)
            VALUES (1, NULL)
            ON DUPLICATE KEY UPDATE id = id
        ");

        return true;
    }

    public function updateLastExecution(): void
    {
        $this->conn->query("UPDATE cron_controle SET ultima_execucao = NOW() WHERE id = 1");
    }
}
