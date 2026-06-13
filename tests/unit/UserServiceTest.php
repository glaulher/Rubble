<?php

namespace Tests\Unit;

use App\Api\Repositories\UserRepository;
use App\Api\Services\UserService;
use PHPUnit\Framework\TestCase;

class UserServiceTest extends TestCase
{
    private function createMockRepo(): UserRepository
    {
        return $this->createMock(UserRepository::class);
    }

    private function createService(?UserRepository $repo = null): UserService
    {
        return new UserService(
            $repo ?? $this->createMockRepo()
        );
    }

    // --- listAll ---

    public function testListAllDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            ['id' => 1, 'username' => 'admin@test.com', 'nome' => 'Admin', 'role' => 'admin'],
        ]);
        $repo->method('count')->willReturn(1);

        $service = $this->createService($repo);
        $result = $service->listAll(null, 20, 0);

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['total']);
    }

    public function testListAllWithSearch(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([]);
        $repo->method('count')->willReturn(0);

        $service = $this->createService($repo);
        $result = $service->listAll('admin', 20, 0);

        $this->assertSame(0, $result['total']);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn([
            'id' => 1,
            'username' => 'admin@test.com',
            'nome' => 'Admin',
            'role' => 'admin',
        ]);

        $service = $this->createService($repo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
        $this->assertSame('admin@test.com', $result['username']);
    }

    public function testGetByIdReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);

        $service = $this->createService($repo);
        $this->assertNull($service->getById(999));
    }

    // --- save ---

    public function testSaveSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);
        $repo->expects($this->once())
            ->method('insert')
            ->willReturn(42);

        $service = $this->createService($repo);
        $result = $service->save([
            'username' => 'new@test.com',
            'nome' => 'New User',
            'password' => 'secret123',
            'role' => 'admin',
        ]);

        $this->assertSame(42, $result);
    }

    public function testSaveHashesPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);
        $repo->expects($this->once())
            ->method('insert')
            ->willReturnCallback(function ($data) {
                $this->assertNotSame('secret123', $data['password']);
                $this->assertTrue(password_verify('secret123', $data['password']));
                return 1;
            });

        $service = $this->createService($repo);
        $service->save([
            'username' => 'new@test.com',
            'nome' => 'New User',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
    }

    public function testSaveThrowsForDuplicateUsername(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(['id' => 5]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Este e-mail já está em uso');

        $service = $this->createService($repo);
        $service->save([
            'username' => 'existing@test.com',
            'nome' => 'User',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
    }

    public function testSaveThrowsForShortPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Senha deve ter pelo menos 6 caracteres');

        $service = $this->createService($repo);
        $service->save([
            'username' => 'new@test.com',
            'nome' => 'User',
            'password' => '12345',
            'role' => 'admin',
        ]);
    }

    public function testSaveThrowsForLongPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Senha não pode ter mais de 128 caracteres');

        $service = $this->createService($repo);
        $service->save([
            'username' => 'new@test.com',
            'nome' => 'User',
            'password' => str_repeat('a', 129),
            'role' => 'admin',
        ]);
    }

    // --- update ---

    public function testUpdateSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);
        $repo->expects($this->once())
            ->method('update');

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'updated@test.com',
            'nome' => 'Updated',
            'password' => 'newpass123',
            'role' => 'coordenador',
        ]);
    }

    public function testUpdateHashesPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);
        $repo->expects($this->once())
            ->method('update')
            ->willReturnCallback(function ($id, $data) {
                $this->assertTrue(password_verify('newpass123', $data['password']));
            });

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'updated@test.com',
            'nome' => 'Updated',
            'password' => 'newpass123',
            'role' => 'admin',
        ]);
    }

    public function testUpdateThrowsForDuplicateUsername(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(['id' => 99]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Este e-mail já está em uso');

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'taken@test.com',
            'nome' => 'User',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
    }

    public function testUpdateAllowsSameUsernameForSameUser(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(['id' => 1]);
        $repo->expects($this->once())->method('update');

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'same@test.com',
            'nome' => 'User',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
    }

    public function testUpdateThrowsForShortPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Senha deve ter pelo menos 6 caracteres');

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'user@test.com',
            'nome' => 'User',
            'password' => '12345',
            'role' => 'admin',
        ]);
    }

    public function testUpdateThrowsForLongPassword(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findByUsername')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Senha não pode ter mais de 128 caracteres');

        $service = $this->createService($repo);
        $service->update(1, [
            'username' => 'user@test.com',
            'nome' => 'User',
            'password' => str_repeat('a', 129),
            'role' => 'admin',
        ]);
    }

    // --- delete ---

    public function testDeleteSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('delete')
            ->with(1);

        $service = $this->createService($repo);
        $service->delete(1, 99);
    }

    public function testDeleteSelfThrows(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Você não pode excluir seu próprio usuário');

        $service = $this->createService();
        $service->delete(1, 1);
    }

    public function testDeleteSelfDoesNotCallRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->never())->method('delete');

        $service = $this->createService($repo);

        try {
            $service->delete(5, 5);
        } catch (\Exception $e) {
            // expected
        }
    }
}
