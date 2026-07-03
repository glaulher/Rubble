<?php

namespace Tests\Unit;

use App\Api\Repositories\PlannedActivityRepository;
use App\Api\Services\PlannedActivityService;
use PHPUnit\Framework\TestCase;

class PlannedActivityServiceTest extends TestCase
{
    private function createMockRepo(): PlannedActivityRepository
    {
        return $this->createMock(PlannedActivityRepository::class);
    }

    private function createService(?PlannedActivityRepository $repo = null): PlannedActivityService
    {
        return new PlannedActivityService($repo);
    }

    public function testPlanActivityThrowsWhenOsIsEmpty(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->planActivity([
            'os' => '',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityThrowsWhenOsHasInvalidChars(): void
    {
        $service = $this->createService();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Formato de OS inválido');

        $service->planActivity([
            'os' => 'OS@#$',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityThrowsWhenOsExceedsMaxLength(): void
    {
        $repo = $this->createMockRepo();
        $service = $this->createService($repo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('OS deve ter no máximo 20 caracteres');

        $service->planActivity([
            'os' => 'ABCDEFGHIJKLMNOPQRSTU',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
        ], ['nome' => 'Admin', 'role' => 'admin']);
    }

    public function testPlanActivityAcceptsAlphaNumericOs(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')->willReturn(null);
        $repo->method('createFromPlanning')->willReturn(1);

        $service = $this->createService($repo);
        $result = $service->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('created', $result['action']);
        $this->assertSame(1, $result['id']);
    }

    public function testPlanActivityUpdatesExistingByOsAndEquip(): void
    {
        $ticket = $this->getMockBuilder(\App\Api\Entities\Ticket::class)
            ->disableOriginalConstructor()
            ->getMock();
        $ticket->id = 5;
        $ticket->notes = 'Observação anterior';

        $repo = $this->createMockRepo();
        $repo->method('findByOsAndEquipment')
            ->willReturn($ticket);

        $service = $this->createService($repo);
        $result = $service->planActivity([
            'os' => 'OS202601',
            'equipamento_id' => '5',
            'data_planejada' => '2026-07-10',
            'equipe' => 'Equipe A',
            'material' => 'Sim',
            'obs' => 'Teste',
        ], ['nome' => 'Admin', 'role' => 'admin']);

        $this->assertSame('updated', $result['action']);
    }
}
