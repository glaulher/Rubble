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
}
