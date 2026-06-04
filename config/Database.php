<?php

namespace App\Config;

use mysqli;

class Database
{
    private static ?mysqli $instance = null;

    public static function connect(): mysqli
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $host = Env::get('DB_HOST', 'localhost');
        $user = Env::get('DB_USER', 'root');
        $pass = Env::get('DB_PASS', '');
        $name = Env::get('DB_NAME', 'manutencao');

        self::$instance = new mysqli($host, $user, $pass, $name);

        if (self::$instance->connect_errno) {
            error_log('DB connection failed: ' . self::$instance->connect_error);
            throw new \RuntimeException('Erro de conexão com o banco de dados');
        }

        self::$instance->set_charset('utf8mb4');

        return self::$instance;
    }
}
