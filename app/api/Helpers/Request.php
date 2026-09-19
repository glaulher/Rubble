<?php

namespace App\Api\Helpers;

class Request
{
    /*
    |--------------------------------------------------------------------------
    | BODY JSON
    |--------------------------------------------------------------------------
    */

    private static ?array $mockBody = null;

    public static function setMockBody(?array $body): void
    {
        self::$mockBody = $body;
    }

    public static function getBody(): array
    {
        return self::body();
    }

    public static function body(): array
    {
        if (self::$mockBody !== null) {
            return self::$mockBody;
        }

        $json =
            file_get_contents('php://input');

        if (empty($json)) {
            return [];
        }

        $data =
            json_decode($json, true);

        if (json_last_error() !== JSON_ERROR_NONE) {

            throw new \InvalidArgumentException(
                'JSON inválido'
            );
        }

        return $data;
    }

    /*
    |--------------------------------------------------------------------------
    | GET
    |--------------------------------------------------------------------------
    */

    public static function get(
        string $field,
        $default = null
    ) {
        return $_GET[$field] ?? $default;
    }

    /*
    |--------------------------------------------------------------------------
    | METHOD
    |--------------------------------------------------------------------------
    */

    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? '';
    }
}