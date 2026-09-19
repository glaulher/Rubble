<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Entities\InventoryItem;
use App\Api\Repositories\InventoryRepository;
use App\Api\Services\InventoryService;
use PHPUnit\Framework\TestCase;

class InventoryServiceTest extends TestCase
{
    private function createMockRepo(): InventoryRepository
    {
        return $this->createMock(InventoryRepository::class);
    }

    private function validPayload(): array
    {
        return [
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Marcos Silva',
            'material_nome' => 'Furadeira de Impacto',
            'modelo' => 'DWD520',
            'serial' => 'SN12345678',
            'data_retirada' => '2026-09-10',
            'data_devolucao' => '2026-09-15',
            'observacoes' => 'Entregue com maleta',
        ];
    }

    // --- Validation tests ---

    public function testValidationFailsOnMissingFields(): void
    {
        $mockRepo = $this->createMockRepo();
        $service = new InventoryService($mockRepo);

        $result = $service->create([], 1);
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('obrigatórios', $result['message']);
    }

    public function testValidationFailsOnInvalidCategory(): void
    {
        $mockRepo = $this->createMockRepo();
        $service = new InventoryService($mockRepo);

        $payload = $this->validPayload();
        $payload['categoria'] = 'categoria_invalida';

        $result = $service->create($payload, 1);
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Categoria inválida', $result['message']);
    }

    public function testValidationFailsWhenReturnDateBeforeCheckoutDate(): void
    {
        $mockRepo = $this->createMockRepo();
        $service = new InventoryService($mockRepo);

        $payload = [
            'categoria' => 'veiculo',
            'tecnico_nome' => 'Marcos',
            'material_nome' => 'Fiat Strada',
            'modelo' => '1.4',
            'serial' => 'ABC1234',
            'data_retirada' => '2026-09-20',
            'data_devolucao' => '2026-09-15',
        ];

        $result = $service->create($payload, 1);
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('devolução não pode ser anterior', $result['message']);
    }

    // --- Create tests ---

    public function testCreateSuccess(): void
    {
        $mockRepo = $this->createMockRepo();
        $payload = $this->validPayload();

        $mockRepo->expects($this->once())
            ->method('create')
            ->with($payload, 1)
            ->willReturn(42);

        $service = new InventoryService($mockRepo);
        $result = $service->create($payload, 1);

        $this->assertTrue($result['success']);
        $this->assertSame(42, $result['data']['id']);
        $this->assertStringContainsString('sucesso', $result['message']);
    }

    public function testCreateFailsWhenRepositoryReturnsZero(): void
    {
        $mockRepo = $this->createMockRepo();
        $payload = $this->validPayload();

        $mockRepo->expects($this->once())
            ->method('create')
            ->willReturn(0);

        $service = new InventoryService($mockRepo);
        $result = $service->create($payload, 1);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Erro ao salvar', $result['message']);
    }

    // --- List tests ---

    public function testListReturnsDataAndTotal(): void
    {
        $mockRepo = $this->createMockRepo();
        $filters = ['search' => 'furadeira'];
        $items = [
            ['id' => 1, 'material_nome' => 'Furadeira'],
        ];

        $mockRepo->expects($this->once())
            ->method('list')
            ->with($filters, 20, 0)
            ->willReturn($items);

        $mockRepo->expects($this->once())
            ->method('count')
            ->with($filters)
            ->willReturn(1);

        $service = new InventoryService($mockRepo);
        $result = $service->list($filters, 20, 0);

        $this->assertTrue($result['success']);
        $this->assertSame($items, $result['data']);
        $this->assertSame(1, $result['total']);
    }

    // --- Get tests ---

    public function testGetSuccessWhenItemFound(): void
    {
        $mockRepo = $this->createMockRepo();
        $item = new InventoryItem([
            'id' => 10,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(10)
            ->willReturn($item);

        $service = new InventoryService($mockRepo);
        $result = $service->get(10);

        $this->assertTrue($result['success']);
        $this->assertSame(10, $result['data']['id']);
        $this->assertSame('Carlos', $result['data']['tecnico_nome']);
    }

    public function testGetNotFound(): void
    {
        $mockRepo = $this->createMockRepo();
        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(999)
            ->willReturn(null);

        $service = new InventoryService($mockRepo);
        $result = $service->get(999);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('não encontrado', $result['message']);
    }

    // --- Update tests ---

    public function testUpdateSuccess(): void
    {
        $mockRepo = $this->createMockRepo();
        $existing = new InventoryItem([
            'id' => 5,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);
        $payload = $this->validPayload();

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(5)
            ->willReturn($existing);

        $mockRepo->expects($this->once())
            ->method('update')
            ->with(5, $payload)
            ->willReturn(true);

        $service = new InventoryService($mockRepo);
        $result = $service->update(5, $payload);

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('sucesso', $result['message']);
    }

    public function testUpdateNotFound(): void
    {
        $mockRepo = $this->createMockRepo();
        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(99)
            ->willReturn(null);

        $service = new InventoryService($mockRepo);
        $result = $service->update(99, $this->validPayload());

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('não encontrado', $result['message']);
    }

    public function testUpdateValidationFails(): void
    {
        $mockRepo = $this->createMockRepo();
        $existing = new InventoryItem([
            'id' => 5,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(5)
            ->willReturn($existing);

        $mockRepo->expects($this->never())
            ->method('update');

        $service = new InventoryService($mockRepo);
        $result = $service->update(5, []);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('obrigatórios', $result['message']);
    }

    public function testUpdateRepositoryFails(): void
    {
        $mockRepo = $this->createMockRepo();
        $existing = new InventoryItem([
            'id' => 5,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);
        $payload = $this->validPayload();

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(5)
            ->willReturn($existing);

        $mockRepo->expects($this->once())
            ->method('update')
            ->with(5, $payload)
            ->willReturn(false);

        $service = new InventoryService($mockRepo);
        $result = $service->update(5, $payload);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Erro ao atualizar', $result['message']);
    }

    // --- Delete tests ---

    public function testDeleteSuccess(): void
    {
        $mockRepo = $this->createMockRepo();
        $existing = new InventoryItem([
            'id' => 3,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(3)
            ->willReturn($existing);

        $mockRepo->expects($this->once())
            ->method('delete')
            ->with(3)
            ->willReturn(true);

        $service = new InventoryService($mockRepo);
        $result = $service->delete(3);

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('sucesso', $result['message']);
    }

    public function testDeleteNotFound(): void
    {
        $mockRepo = $this->createMockRepo();
        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(88)
            ->willReturn(null);

        $service = new InventoryService($mockRepo);
        $result = $service->delete(88);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('não encontrado', $result['message']);
    }

    public function testDeleteRepositoryFails(): void
    {
        $mockRepo = $this->createMockRepo();
        $existing = new InventoryItem([
            'id' => 3,
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos',
            'material_nome' => 'Alicate',
            'modelo' => 'Universal',
            'serial' => 'SN999',
            'data_retirada' => '2026-09-01',
        ]);

        $mockRepo->expects($this->once())
            ->method('findById')
            ->with(3)
            ->willReturn($existing);

        $mockRepo->expects($this->once())
            ->method('delete')
            ->with(3)
            ->willReturn(false);

        $service = new InventoryService($mockRepo);
        $result = $service->delete(3);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Erro ao excluir', $result['message']);
    }

    // --- Technicians test ---

    public function testGetTechnicians(): void
    {
        $mockRepo = $this->createMockRepo();
        $techs = ['Ana', 'Bruno', 'Carlos'];

        $mockRepo->expects($this->once())
            ->method('getDistinctTechnicians')
            ->willReturn($techs);

        $service = new InventoryService($mockRepo);
        $result = $service->getTechnicians();

        $this->assertTrue($result['success']);
        $this->assertSame($techs, $result['data']);
    }
}
