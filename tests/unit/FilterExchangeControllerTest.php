<?php

namespace Tests\Unit;

use App\Api\Controllers\FilterExchangeController;
use PHPUnit\Framework\TestCase;

class FilterExchangeControllerTest extends TestCase
{
    public function testUpdateFieldMethodExistsAndIsPublic(): void
    {
        $reflection = new \ReflectionMethod(FilterExchangeController::class, 'updateField');
        $this->assertTrue($reflection->isPublic());
    }
}
