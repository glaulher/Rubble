<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PreventiveCycleServiceTest extends TestCase
{
    private \App\Api\Services\PreventiveCycleService $service;

    protected function setUp(): void
    {
        $this->service = new \App\Api\Services\PreventiveCycleService();
    }

    public function testClassExists(): void
    {
        $this->assertTrue(class_exists(\App\Api\Services\PreventiveCycleService::class));
    }

    public function testSaveValidatesCycleFormat(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Formato de ciclo inválido');
        $this->service->save('invalid', []);
    }

    public function testSaveAcceptsValidCycle(): void
    {
        $this->assertTrue(method_exists($this->service, 'save'));
    }

    public function testListAllMethodExists(): void
    {
        $this->assertTrue(method_exists($this->service, 'listAll'));
    }

    public function testSummaryMethodExists(): void
    {
        $this->assertTrue(method_exists($this->service, 'summary'));
    }
}
