<?php

namespace Tests\Unit;

use App\Api\Controllers\EquipmentController;
use PHPUnit\Framework\TestCase;

class EquipmentControllerTest extends TestCase
{
    public function testTicketsByIdsMethodExistsAndIsPublic(): void
    {
        $reflection = new \ReflectionMethod(EquipmentController::class, 'ticketsByIds');
        $this->assertTrue($reflection->isPublic());
    }
}
