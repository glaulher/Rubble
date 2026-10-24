<?php

namespace Tests\Unit;

use App\Api\Repositories\TeamRepository;
use App\Api\Services\TeamService;
use PHPUnit\Framework\TestCase;

class TeamServiceTest extends TestCase
{
    private function createMockRepo(): TeamRepository
    {
        return $this->createMock(TeamRepository::class);
    }

    private function createService(?TeamRepository $repository = null): TeamService
    {
        return new TeamService($repository ?? $this->createMockRepo());
    }

    // --- listAll ---

    public function testListAllDelegatesToRepository(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('listAll')->willReturn([
            ['id' => 1, 'nome' => 'Alpha', 'ativo' => 1],
        ]);
        $repository->method('count')->willReturn(1);

        $service = $this->createService($repository);
        $result  = $service->listAll();

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
    }

    // --- save ---

    public function testSaveSuccessWithUniqueName(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('findByNameCase')->willReturn(null);
        $repository->expects($this->once())
            ->method('save')
            ->willReturn(5);

        $service = $this->createService($repository);
        $result  = $service->save(['nome' => 'Alpha']);

        $this->assertSame(5, $result);
    }

    public function testSaveThrowsForDuplicateNameCaseInsensitive(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('findByNameCase')->willReturn(['id' => 3, 'nome' => 'alpha']);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Esta equipe já está cadastrada');

        $service = $this->createService($repository);
        $service->save(['nome' => 'Alpha']);
    }

    public function testSaveThrowsForEmptyName(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Nome da equipe é obrigatório');

        $service = $this->createService();
        $service->save(['nome' => '']);
    }

    public function testSaveThrowsForNameTooLong(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Nome da equipe não pode ter mais de 100 caracteres');

        $service = $this->createService();
        $service->save(['nome' => str_repeat('A', 101)]);
    }

    // --- update ---

    public function testUpdateSuccess(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('findByNameCase')->willReturn(null);
        $repository->expects($this->once())->method('update')->with(1, ['nome' => 'Beta', 'ativo' => 1]);

        $service = $this->createService($repository);
        $service->update(1, ['nome' => 'Beta', 'ativo' => 1]);
    }

    public function testUpdateThrowsForDuplicateNameOnAnotherRecord(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('findByNameCase')->willReturn(['id' => 99, 'nome' => 'beta']);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Esta equipe já está cadastrada');

        $service = $this->createService($repository);
        $service->update(1, ['nome' => 'Beta']);
    }

    public function testUpdateAllowsSameNameForSameRecord(): void
    {
        $repository = $this->createMockRepo();
        $repository->method('findByNameCase')->willReturn(['id' => 1, 'nome' => 'alpha']);
        $repository->expects($this->once())->method('update');

        $service = $this->createService($repository);
        $service->update(1, ['nome' => 'Alpha']);
    }

    public function testUpdateThrowsForEmptyName(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Nome da equipe é obrigatório');

        $service = $this->createService();
        $service->update(1, ['nome' => '  ']);
    }

    // --- delete ---

    public function testDeleteCallsRepository(): void
    {
        $repository = $this->createMockRepo();
        $repository->expects($this->once())->method('delete')->with(7);

        $service = $this->createService($repository);
        $service->delete(7);
    }
}
