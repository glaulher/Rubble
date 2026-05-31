<?php

namespace App\Api\Helpers;

class Response
{
    /*
    |--------------------------------------------------------------------------
    | JSON
    |--------------------------------------------------------------------------
    */

    public static function json(
        array $data,
        int $status = 200
    ): void {

        self::outputJson($data, $status);
        exit;
    }

    protected static function outputJson(
        array $data,
        int $status = 200
    ): void {

        http_response_code($status);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    public static function success(
        string $message,
        array $data = [],
        int $status = 200
    ): void {

        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    public static function error(
        string $message,
        int $status = 500
    ): void {

        self::json([
            'success' => false,
            'message' => $message
        ], $status);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION ERROR
    |--------------------------------------------------------------------------
    */

    public static function validation(
        string $message
    ): void {

        self::error($message, 400);
    }

    /*
    |--------------------------------------------------------------------------
    | NOT FOUND
    |--------------------------------------------------------------------------
    */

    public static function notFound(
        string $message = 'Recurso não encontrado'
    ): void {

        self::error($message, 404);
    }

    /*
    |--------------------------------------------------------------------------
    | UNAUTHORIZED
    |--------------------------------------------------------------------------
    */

    public static function unauthorized(
        string $message = 'Não autorizado'
    ): void {

        self::error($message, 401);
    }
}
