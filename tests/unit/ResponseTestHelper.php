<?php

namespace Tests\Unit;

use App\Api\Helpers\Response;

class ResponseTestHelper extends Response
{
    public static function callOutputJson(array $data, int $status = 200): void
    {
        self::outputJson($data, $status);
    }
}
