<?php

namespace App\Api\Repositories;

use App\Config\Database;
use mysqli;

abstract class BaseRepository
{
    protected mysqli $conn;

    public function __construct()
    {
        $this->conn = Database::connect();
    }

    protected function safePrepare(string $sql): \mysqli_stmt
    {
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            throw new \RuntimeException(
                'Erro interno na consulta: ' . $this->conn->error
            );
        }
        return $stmt;
    }

    public function beginTransaction(): void
    {
        $this->conn->begin_transaction();
    }

    public function commit(): void
    {
        $this->conn->commit();
    }

    public function rollback(): void
    {
        $this->conn->rollback();
    }
}
