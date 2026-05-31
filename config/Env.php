<?php

namespace App\Config;

class Env
{
    private static array $loaded = [];

    public static function load(string $path): void
    {
        if (!file_exists($path) || !is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $parts = explode('=', $line, 2);

            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            $value = trim($parts[1]);

            $value = preg_replace('/^["\'](.*)["\']$/', '$1', $value);

            self::$loaded[$key] = $value;

            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $value = self::$loaded[$key]
            ?? $_ENV[$key]
            ?? getenv($key);

        return $value !== false && $value !== null ? $value : $default;
    }
}
