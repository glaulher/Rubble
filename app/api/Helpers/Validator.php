<?php

namespace App\Api\Helpers;

use Exception;

class Validator
{
    /*
    |--------------------------------------------------------------------------
    | REQUIRED
    |--------------------------------------------------------------------------
    */

    public static function required(
        array $data,
        array $fields
    ): void {

        foreach ($fields as $field) {

            if (
                !isset($data[$field]) ||
                (!is_string($data[$field]) ? empty($data[$field]) : trim($data[$field]) === '')
            ) {

                throw new Exception(
                    "Campo '{$field}' é obrigatório"
                );
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | INTEGER
    |--------------------------------------------------------------------------
    */

    public static function integer(
        array $data,
        string $field
    ): void {

        if (
            isset($data[$field]) &&
            !filter_var(
                $data[$field],
                FILTER_VALIDATE_INT
            )
        ) {

            throw new Exception(
                "Campo '{$field}' deve ser inteiro"
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | MAX LENGTH
    |--------------------------------------------------------------------------
    */

    public static function max(
        array $data,
        string $field,
        int $length
    ): void {

        if (
            isset($data[$field]) &&
            mb_strlen($data[$field]) > $length
        ) {

            throw new Exception(
                "Campo '{$field}' excede {$length} caracteres"
            );
        }
    }
}