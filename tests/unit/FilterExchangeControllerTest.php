<?php

namespace Tests\Unit;

use App\Api\Controllers\FilterExchangeController;
use App\Api\Services\FilterExchangeService;
use PHPUnit\Framework\TestCase;

class FilterExchangeControllerTest extends TestCase
{
    protected function tearDown(): void
    {
        \App\Api\Helpers\Response::$exitEnabled = true;
        unset($_GET['id']);
        parent::tearDown();
    }

    public function testUpdateFieldMethodExistsAndIsPublic(): void
    {
        $reflection = new \ReflectionMethod(FilterExchangeController::class, 'updateField');
        $this->assertTrue($reflection->isPublic());
    }

    public function testDeleteMethodExistsAndIsPublic(): void
    {
        $reflection = new \ReflectionMethod(FilterExchangeController::class, 'delete');
        $this->assertTrue($reflection->isPublic());
    }

    public function testConstructorAcceptsCurrentUser(): void
    {
        $ctrl = new FilterExchangeController(null, (object) ['role' => 'admin']);
        $this->assertInstanceOf(FilterExchangeController::class, $ctrl);
    }

    public function testDeleteReturnsSuccessJson(): void
    {
        \App\Api\Helpers\Response::$exitEnabled = false;
        $_GET['id'] = '7';

        $service = $this->createMock(FilterExchangeService::class);
        $service->expects($this->once())
            ->method('delete')
            ->with(7)
            ->willReturn(true);

        $ctrl = new FilterExchangeController($service, (object) ['role' => 'admin']);

        ob_start();
        $ctrl->delete();
        $out = ob_get_clean();

        $this->assertStringContainsString('"success": true', $out);
        $this->assertStringContainsString('Filtro excl', $out);
    }

    public function testDeleteWithoutIdReturnsError(): void
    {
        \App\Api\Helpers\Response::$exitEnabled = false;
        unset($_GET['id']);

        $service = $this->createMock(FilterExchangeService::class);
        $service->expects($this->never())->method('delete');

        $ctrl = new FilterExchangeController($service, (object) ['role' => 'admin']);

        ob_start();
        $ctrl->delete();
        $out = ob_get_clean();

        $this->assertStringContainsString('"success": false', $out);
        $this->assertStringContainsString('id', $out);
    }
}
