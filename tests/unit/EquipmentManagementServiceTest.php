<?php

namespace Tests\Unit;

use App\Api\Repositories\EquipmentManagementRepository;
use App\Api\Services\EquipmentManagementService;
use PHPUnit\Framework\TestCase;

class EquipmentManagementServiceTest extends TestCase
{
    private function createMockRepo(): EquipmentManagementRepository
    {
        return $this->createMock(EquipmentManagementRepository::class);
    }

    private function createService(?EquipmentManagementRepository $repo = null): EquipmentManagementService
    {
        return new EquipmentManagementService(
            $repo ?? $this->createMockRepo()
        );
    }

    // --- listAll ---

    public function testListAllDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            ['id' => 1, 'equipamento' => 'SELF 01', 'local' => 'RSD'],
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
        $result = $service->listAll('SELF', 20, 0);

        $this->assertSame(0, $result['total']);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn([
            'id' => 1,
            'equipamento' => 'SELF 01',
            'local' => 'RSD',
        ]);

        $service = $this->createService($repo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
        $this->assertSame('SELF 01', $result['equipamento']);
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
        $repo->method('findOrCreateEndereco')->willReturn(10);
        $repo->expects($this->once())
            ->method('insert')
            ->willReturnCallback(function ($data) {
                $this->assertSame(10, $data['endereco_id']);
                return 42;
            });

        $service = $this->createService($repo);
        $result = $service->save([
            'equipamento' => 'SELF 01',
            'capacidade' => 10,
            'local' => 'RSD',
            'localidade' => 'Container 1',
            'local_do_endereco' => 'RSD DTC',
            'endereco' => 'Rua Teste, 123',
            'uf' => 'RJ',
            'mercado' => 'Residencial',
            'local_scm' => 'RSDDTC',
        ]);

        $this->assertSame(42, $result);
    }

    public function testSaveThrowsForEmptyMercado(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Mercado é obrigatório');

        $service->save([
            'equipamento' => 'SELF 01',
            'mercado' => '',
        ]);
    }

    public function testSaveThrowsForInvalidMercado(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Mercado inválido');

        $service->save([
            'equipamento' => 'SELF 01',
            'mercado' => 'Comercial',
        ]);
    }

    public function testSaveCallsFindOrCreateEndereco(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('findOrCreateEndereco')
            ->with('RSD DTC', 'Rua Teste', 'RJ')
            ->willReturn(10);
        $repo->method('insert')->willReturn(1);

        $service = $this->createService($repo);
        $service->save([
            'equipamento' => 'SELF 01',
            'local_do_endereco' => 'RSD DTC',
            'endereco' => 'Rua Teste',
            'uf' => 'RJ',
            'mercado' => 'Residencial',
        ]);
    }

    // --- update ---

    public function testUpdateSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findOrCreateEndereco')->willReturn(10);
        $repo->expects($this->once())
            ->method('update')
            ->willReturnCallback(function ($id, $data) {
                $this->assertSame(1, $id);
                $this->assertSame(10, $data['endereco_id']);
            });

        $service = $this->createService($repo);
        $service->update(1, [
            'equipamento' => 'SELF 02',
            'local_do_endereco' => 'RSD DTC',
            'endereco' => 'Rua Teste',
            'uf' => 'RJ',
            'mercado' => 'Empresarial',
        ]);
    }

    public function testUpdateThrowsForInvalidMercado(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findOrCreateEndereco')->willReturn(10);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Mercado inválido');

        $service = $this->createService($repo);
        $service->update(1, [
            'local_do_endereco' => 'RSD',
            'endereco' => 'Rua',
            'uf' => 'RJ',
            'mercado' => 'Indústria',
        ]);
    }

    public function testUpdateAllowsValidMercado(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('findOrCreateEndereco')->willReturn(10);
        $repo->expects($this->once())->method('update');

        $service = $this->createService($repo);
        $service->update(1, [
            'local_do_endereco' => 'RSD',
            'endereco' => 'Rua',
            'uf' => 'RJ',
            'mercado' => 'Pessoal',
        ]);
    }

    // --- delete ---

    public function testDeleteSuccess(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => true,
            'registros_count' => 0,
            'pvs_count' => 0,
        ]);
        $repo->method('getEnderecoId')->willReturn(10);
        $repo->expects($this->once())->method('delete')->with(1);
        $repo->expects($this->once())->method('cleanupOrphanEndereco')->with(10);

        $service = $this->createService($repo);
        $service->delete(1);
    }

    public function testDeleteThrowsWhenHasRegistros(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => false,
            'registros_count' => 5,
            'pvs_count' => 0,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Não é possível excluir');
        $this->expectExceptionMessage('5 registro(s)');

        $service = $this->createService($repo);
        $service->delete(1);
    }

    public function testDeleteThrowsWhenHasPvs(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => false,
            'registros_count' => 0,
            'pvs_count' => 3,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Não é possível excluir');
        $this->expectExceptionMessage('3 PV(s)');

        $service = $this->createService($repo);
        $service->delete(1);
    }

    public function testDeleteThrowsWhenHasBoth(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => false,
            'registros_count' => 2,
            'pvs_count' => 4,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Não é possível excluir');
        $this->expectExceptionMessage('2 registro(s) e 4 PV(s)');

        $service = $this->createService($repo);
        $service->delete(1);
    }

    public function testDeleteCleansUpOrphanEndereco(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => true,
            'registros_count' => 0,
            'pvs_count' => 0,
        ]);
        $repo->method('getEnderecoId')->willReturn(10);
        $repo->expects($this->once())->method('delete');
        $repo->expects($this->once())->method('cleanupOrphanEndereco')->with(10);

        $service = $this->createService($repo);
        $service->delete(1);
    }

    public function testDeleteSkipsCleanupWhenNoEndereco(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('canDelete')->willReturn([
            'can_delete' => true,
            'registros_count' => 0,
            'pvs_count' => 0,
        ]);
        $repo->method('getEnderecoId')->willReturn(null);
        $repo->expects($this->once())->method('delete');
        $repo->expects($this->never())->method('cleanupOrphanEndereco');

        $service = $this->createService($repo);
        $service->delete(1);
    }
}
