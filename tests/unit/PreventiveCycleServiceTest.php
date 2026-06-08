<?php

namespace Tests\Unit;

use App\Api\Services\PreventiveCycleService;
use PHPUnit\Framework\TestCase;

class PreventiveCycleServiceTest extends TestCase
{
    private function createService(): PreventiveCycleService
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        return new PreventiveCycleService($mockRepo);
    }

    public function testClassExists(): void
    {
        $this->assertTrue(class_exists(PreventiveCycleService::class));
    }

    public function testSaveValidatesCycleFormat(): void
    {
        $service = $this->createService();
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Formato de ciclo inválido');
        $service->save('invalid', []);
    }

    public function testSaveWithValidCycleDoesNotThrow(): void
    {
        $service = $this->createService();
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->method('saveBatch')->willReturn(['saved' => 3, 'deleted' => 0]);
        $service = new PreventiveCycleService($mockRepo);
        $result = $service->save('2026-06', [
            ['equipamento_id' => 1, 'checked' => true, 'observacao' => 'obs'],
        ]);
        $this->assertArrayHasKey('saved', $result);
        $this->assertArrayHasKey('deleted', $result);
    }

    public function testListAllMethodExists(): void
    {
        $this->assertTrue(method_exists(PreventiveCycleService::class, 'listAll'));
    }

    public function testSummaryMethodExists(): void
    {
        $this->assertTrue(method_exists(PreventiveCycleService::class, 'summary'));
    }
}
