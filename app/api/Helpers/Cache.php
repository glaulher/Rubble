<?php

namespace App\Api\Helpers;

class Cache
{
    private static ?bool $apcuAvailable = null;

    public static function isApcuAvailable(): bool
    {
        if (self::$apcuAvailable === null) {
            self::$apcuAvailable = extension_loaded('apcu') && ini_get('apc.enabled');
        }
        return self::$apcuAvailable;
    }

    public static function get(string $key): mixed
    {
        if (self::isApcuAvailable()) {
            $cached = apcu_fetch($key);
            return $cached !== false ? $cached : null;
        }
        return self::fileGet($key);
    }

    public static function set(string $key, mixed $value, int $ttl = 10): void
    {
        if (self::isApcuAvailable()) {
            apcu_store($key, $value, $ttl);
            return;
        }
        self::fileSet($key, $key, $value, $ttl);
    }

    public static function delete(string $key): void
    {
        if (self::isApcuAvailable()) {
            apcu_delete($key);
            return;
        }
        self::fileDelete($key);
    }

    public static function deleteByPrefix(string $prefix): void
    {
        if (self::isApcuAvailable()) {
            $info = apcu_cache_info(true);
            foreach ($info as $entry) {
                $key = $entry['info'] ?? '';
                if (str_starts_with($key, $prefix)) {
                    apcu_delete($key);
                }
            }
            return;
        }
        self::fileDeleteByPrefix($prefix);
    }

    public static function buildKey(string $prefix, array $params): string
    {
        return $prefix . '_' . md5(serialize($params));
    }

    private static function fileGet(string $key): mixed
    {
        $path = self::filePath($key);
        if (!file_exists($path)) {
            return null;
        }
        $data = @file_get_contents($path);
        if ($data === false) {
            return null;
        }
        $cached = json_decode($data, true);
        if (!$cached || !isset($cached['expires']) || $cached['expires'] < time()) {
            @unlink($path);
            return null;
        }
        return $cached['value'];
    }

    private static function fileSet(string $key, string $originalKey, mixed $value, int $ttl): void
    {
        $dir = self::fileDir();
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $data = json_encode([
            'expires' => time() + $ttl,
            'key' => $originalKey,
            'value' => $value,
        ]);
        if ($data !== false) {
            file_put_contents(self::filePath($key), $data, LOCK_EX);
        }
    }

    private static function fileDelete(string $key): void
    {
        $path = self::filePath($key);
        if (file_exists($path)) {
            @unlink($path);
        }
    }

    private static function fileDeleteByPrefix(string $prefix): void
    {
        $dir = self::fileDir();
        $files = glob($dir . '/*.cache');
        if (!$files) return;
        foreach ($files as $path) {
            $data = @file_get_contents($path);
            if ($data === false) continue;
            $cached = json_decode($data, true);
            if (!$cached || !isset($cached['key'])) continue;
            if (str_starts_with($cached['key'], $prefix)) {
                @unlink($path);
            }
        }
    }

    private static function fileDir(): string
    {
        $dir = __DIR__ . '/../../../cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        return realpath($dir) ?: $dir;
    }

    private static function filePath(string $key): string
    {
        return self::fileDir() . '/' . md5($key) . '.cache';
    }
}
