<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Controllers\AuthController;
use App\Api\Helpers\Response;
use App\Api\Services\EquipmentPriceService;
use App\Api\Services\PvService;

class DeadCodeCleanupTest extends TestCase
{
    public function testPvServiceGetDefaultItemStatusRemoved(): void
    {
        $this->assertFalse(
            method_exists(PvService::class, 'getDefaultItemStatus'),
            'Dead method PvService::getDefaultItemStatus() should be removed'
        );
    }

    public function testResponseNoContentRemoved(): void
    {
        $this->assertFalse(
            method_exists(Response::class, 'noContent'),
            'Dead method Response::noContent() should be removed'
        );
    }

    public function testExceptionImportRemovedFromControllers(): void
    {
        $files = [
            __DIR__ . '/../../app/api/Controllers/AuthController.php',
            __DIR__ . '/../../app/api/Controllers/EquipmentManagementController.php',
            __DIR__ . '/../../app/api/Controllers/PlannedActivityController.php',
            __DIR__ . '/../../app/api/Controllers/PreventivaController.php',
            __DIR__ . '/../../app/api/Controllers/PreventiveCycleController.php',
            __DIR__ . '/../../app/api/Controllers/PvController.php',
            __DIR__ . '/../../app/api/Controllers/PvDashboardController.php',
            __DIR__ . '/../../app/api/Controllers/ScmController.php',
            __DIR__ . '/../../app/api/Controllers/TicketController.php',
            __DIR__ . '/../../app/api/Controllers/UserController.php',
        ];

        foreach ($files as $file) {
            $content = file_get_contents($file);
            $this->assertStringNotContainsString(
                'use Exception;',
                $content,
                basename($file) . ' should not have redundant use Exception'
            );
        }
    }

    public function testAuthControllerHasGetAuthenticatedUser(): void
    {
        $reflection = new \ReflectionClass(AuthController::class);
        $this->assertTrue(
            $reflection->hasMethod('getAuthenticatedUser'),
            'AuthController should have private getAuthenticatedUser() instead of duplicated token extraction'
        );
        $method = $reflection->getMethod('getAuthenticatedUser');
        $this->assertTrue($method->isPrivate(), 'getAuthenticatedUser should be private');
    }

    public function testEquipmentPriceServiceHasSumValueByFilter(): void
    {
        $this->assertTrue(
            method_exists(EquipmentPriceService::class, 'sumValueByFilter'),
            'EquipmentPriceService should have sumValueByFilter() for Controller to use instead of Repository directly'
        );
    }

    public function testEquipmentPriceServiceHasCountByFilter(): void
    {
        $this->assertTrue(
            method_exists(EquipmentPriceService::class, 'countByFilter'),
            'EquipmentPriceService should have countByFilter() for Controller to use instead of Repository directly'
        );
    }

    public function testCacheHasInvalidateGroup(): void
    {
        $this->assertTrue(
            method_exists(\App\Api\Helpers\Cache::class, 'invalidateGroup'),
            'Cache should have invalidateGroup() to replace repetitive deleteByPrefix calls'
        );
    }
}
