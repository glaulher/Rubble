<?php

namespace Tests\Unit;

use App\Api\Services\PreventivaService;
use PHPUnit\Framework\TestCase;

class PreventivaServiceTest extends TestCase
{
    public function testClassExists(): void
    {
        $this->assertTrue(class_exists(PreventivaService::class));
    }

    public function testUpdateStatusWithoutDateDoesNotPassDataPlanejada(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Cancelado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything());

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', 'reagendado', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testUpdateStatusWithDatePassesDataPlanejadaToRepository(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything(), '2026-08-15');

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', '', ['nome' => 'Test', 'role' => 'admin'], '2026-08-15');
    }

    public function testUpdateStatusThrowsOnInvalidTransition(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Concluído',
            'obs' => '',
        ]);

        $service = new PreventivaService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Transição inválida');
        $service->updateStatus(1, 'Cancelado', '', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testDeleteMethodExists(): void
    {
        $this->assertTrue(method_exists(PreventivaService::class, 'delete'));
    }
}
