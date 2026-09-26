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

    public function testListAllForwardsScmStatuses(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->expects($this->once())
            ->method('listByCiclo')
            ->with('2026-06', 20, 0, '', false, false, false, false, $this->anything(), $this->anything(), $this->anything(), ['SCM aprovado', 'SCM negado'])
            ->willReturn([]);
        $mockRepo->expects($this->once())
            ->method('count')
            ->with('2026-06', '', false, false, false, false, $this->anything(), $this->anything(), ['SCM aprovado', 'SCM negado'])
            ->willReturn(0);

        $service = new PreventiveCycleService($mockRepo);
        $result = $service->listAll('2026-06', 20, 0, '', false, false, false, false, ['SCM aprovado', 'SCM negado']);
        $this->assertEquals(['items' => [], 'total' => 0], $result);
    }

    public function testSummaryForwardsScmStatuses(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->expects($this->once())
            ->method('summary')
            ->with('2026-06', false, false, false, $this->anything(), $this->anything(), $this->anything(), ['SCM enviado'])
            ->willReturn(['checked_count' => 5, 'total_valor' => 1000.0, 'site_count' => 2]);

        $service = new PreventiveCycleService($mockRepo);
        $result = $service->summary('2026-06', false, false, false, ['SCM enviado']);
        $this->assertEquals(5, $result['checked_count']);
    }

    public function testListIdsForwardsScmStatuses(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->expects($this->once())
            ->method('listIdsByCiclo')
            ->with('2026-06', '', false, false, false, $this->anything(), $this->anything(), ['SCM verificado'])
            ->willReturn([1, 2, 3]);

        $service = new PreventiveCycleService($mockRepo);
        $result = $service->listIds('2026-06', '', false, false, false, ['SCM verificado']);
        $this->assertEquals([1, 2, 3], $result);
    }

    public function testAutoLinkScmsValidatesCycleFormat(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $service = new PreventiveCycleService($mockRepo);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Formato de ciclo inválido');
        $service->autoLinkScms('invalid-cycle');
    }

    public function testAutoLinkScmsCallsRepositoryAndReturnsLinkedCount(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->expects($this->once())
            ->method('autoLinkScms')
            ->with('2026-09', false)
            ->willReturn(15);

        $service = new PreventiveCycleService($mockRepo);
        $result = $service->autoLinkScms('2026-09', false);

        $this->assertSame('2026-09', $result['ciclo']);
        $this->assertSame(15, $result['linked']);
    }

    public function testScmStatusCountIncludesScmEmAbertoInOrder(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventiveCycleRepository::class);
        $mockRepo->expects($this->once())
            ->method('scmStatusCount')
            ->with('2026-09', $this->anything(), $this->anything(), ['SCM em aberto', 'SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado'])
            ->willReturn(['SCM em aberto' => 3, 'SCM aprovado' => 20]);

        $service = new PreventiveCycleService($mockRepo);
        $result = $service->scmStatusCount('2026-09');

        $this->assertSame(3, $result['SCM em aberto']);
        $this->assertSame(20, $result['SCM aprovado']);
    }
}

