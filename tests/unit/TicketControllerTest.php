<?php

namespace Tests\Unit;

use App\Api\Controllers\TicketController;
use PHPUnit\Framework\TestCase;

class TicketControllerTest extends TestCase
{
    public function testImportMethodExistsAndIsPublic(): void
    {
        $reflection = new \ReflectionMethod(TicketController::class, 'import');
        $this->assertTrue($reflection->isPublic());
    }
}
