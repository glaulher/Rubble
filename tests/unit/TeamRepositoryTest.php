<?php

namespace Tests\Unit;

use App\Api\Repositories\TeamRepository;
use PHPUnit\Framework\TestCase;

class TeamRepositoryTest extends TestCase
{
    private function createRepoWithMockStmt(\mysqli_stmt $stmt): TeamRepository
    {
        $repository = $this->getMockBuilder(TeamRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['safePrepare'])
            ->getMock();

        $repository->method('safePrepare')->willReturn($stmt);

        return $repository;
    }

    private function createMockStmt(): \mysqli_stmt
    {
        return $this->getMockBuilder(\mysqli_stmt::class)
            ->disableOriginalConstructor()
            ->getMock();
    }

    // --- count ---

    public function testCountReturnsTotalFromDb(): void
    {
        $stmt   = $this->createMockStmt();
        $result = $this->createMock(\mysqli_result::class);
        $result->method('fetch_assoc')->willReturn(['total' => 3]);
        $stmt->method('get_result')->willReturn($result);
        $stmt->method('execute');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);

        $total = $repository->count();
        $this->assertSame(3, $total);
    }

    public function testCountReturnsZeroOnNull(): void
    {
        $stmt   = $this->createMockStmt();
        $result = $this->createMock(\mysqli_result::class);
        $result->method('fetch_assoc')->willReturn(['total' => null]);
        $stmt->method('get_result')->willReturn($result);
        $stmt->method('execute');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);

        $this->assertSame(0, $repository->count());
    }

    // --- listAll ---

    public function testListAllReturnsFetchAllResult(): void
    {
        $stmt   = $this->createMockStmt();
        $result = $this->createMock(\mysqli_result::class);
        $result->method('fetch_all')->willReturn([
            ['id' => 1, 'nome' => 'Alpha', 'ativo' => 1],
            ['id' => 2, 'nome' => 'Beta',  'ativo' => 1],
        ]);
        $stmt->method('get_result')->willReturn($result);
        $stmt->method('execute');
        $stmt->method('bind_param');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);
        $items = $repository->listAll(9999, 0);

        $this->assertCount(2, $items);
        $this->assertSame('Alpha', $items[0]['nome']);
    }

    // --- findByNameCase ---

    public function testFindByNameCaseReturnsRowWhenFound(): void
    {
        $stmt   = $this->createMockStmt();
        $result = $this->createMock(\mysqli_result::class);
        $result->method('fetch_assoc')->willReturn(['id' => 1, 'nome' => 'Alpha', 'ativo' => 1]);
        $stmt->method('get_result')->willReturn($result);
        $stmt->method('execute');
        $stmt->method('bind_param');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);
        $row  = $repository->findByNameCase('ALPHA');

        $this->assertNotNull($row);
        $this->assertSame(1, $row['id']);
    }

    public function testFindByNameCaseReturnsNullWhenNotFound(): void
    {
        $stmt   = $this->createMockStmt();
        $result = $this->createMock(\mysqli_result::class);
        $result->method('fetch_assoc')->willReturn(false);
        $stmt->method('get_result')->willReturn($result);
        $stmt->method('execute');
        $stmt->method('bind_param');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);
        $this->assertNull($repository->findByNameCase('none'));
    }

    // --- update ---

    public function testUpdateCallsExecute(): void
    {
        $stmt = $this->createMockStmt();
        $stmt->expects($this->once())->method('execute');
        $stmt->method('bind_param');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);
        $repository->update(1, ['nome' => 'Alpha', 'ativo' => 1]);
    }

    // --- delete ---

    public function testDeleteCallsExecute(): void
    {
        $stmt = $this->createMockStmt();
        $stmt->expects($this->once())->method('execute');
        $stmt->method('bind_param');
        $stmt->method('close');

        $repository = $this->createRepoWithMockStmt($stmt);
        $repository->delete(1);
    }
}
