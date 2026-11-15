<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Services\DiarioService;
use App\Api\Repositories\DiarioRepository;

class DiarioServiceTest extends TestCase
{
    private DiarioRepository $repo;
    private DiarioService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new DiarioRepository();
        $this->repo->beginTransaction();
        $this->service = new DiarioService($this->repo);
    }

    protected function tearDown(): void
    {
        $this->repo->rollback();
        parent::tearDown();
    }

    public function testCreateWithDefaults(): void
    {
        $user = ['id' => 1, 'nome' => 'Coord User', 'role' => 'coordenador'];
        $result = $this->service->create([], $user);

        $this->assertGreaterThan(0, $result['id']);
        $item = $result['item'];
        $this->assertSame(date('Y-m-d'), $item['data']);
        $this->assertNull($item['os']);
        $this->assertNull($item['localidade']);
        $this->assertNull($item['equipamento_id']);
        $this->assertSame(1, $item['created_by']);
    }

    public function testCreateWithInvalidDataThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];

        $this->expectException(\InvalidArgumentException::class);
        $this->service->create(['data' => 'invalid-date'], $user);
    }

    public function testCreateWithInvalidCategoryThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];

        $this->expectException(\InvalidArgumentException::class);
        $this->service->create(['categoria' => 'categoria_inexistente'], $user);
    }

    public function testCreateWithAllValidCategories(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];
        foreach (['corretiva', 'preventiva', 'emergencial', 'administrativa'] as $cat) {
            $result = $this->service->create(['categoria' => $cat], $user);
            $this->assertGreaterThan(0, $result['id']);
            $this->assertSame($cat, $result['item']['categoria']);
        }
    }

    public function testCreateWithTimesAndPlaca(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];
        $result = $this->service->create([
            'categoria' => 'emergencial',
            'hora_inicio' => '08:00',
            'hora_saida' => '12:30',
            'equipe' => 'Alexandre Donato',
            'placa' => 'TBO-9J41',
        ], $user);

        $this->assertGreaterThan(0, $result['id']);
        $item = $result['item'];
        $this->assertSame('08:00', $item['hora_inicio']);
        $this->assertSame('12:30', $item['hora_saida']);
        $this->assertSame('TBO-9J41', $item['placa']);
        $this->assertSame('emergencial', $item['categoria']);
    }

    public function testCreateWithInvalidTimeFormatThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];

        $this->expectException(\InvalidArgumentException::class);
        $this->service->create(['hora_inicio' => '25:99'], $user);
    }

    public function testCreateWithInvalidStatusThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];

        $this->expectException(\InvalidArgumentException::class);
        $this->service->create(['status' => 'Status Invalido'], $user);
    }

    public function testUpdateFieldValidAndNa(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];
        $created = $this->service->create(['site' => 'S1', 'os' => 'OS123'], $user);
        $id = $created['id'];

        // Update site
        $res = $this->service->updateField($id, 'site', 'S2');
        $this->assertSame('S2', $res['value']);

        // Update equipe
        $resEquipe = $this->service->updateField($id, 'equipe', 'Técnico Oliveira');
        $this->assertSame('Técnico Oliveira', $resEquipe['value']);
        $item = $this->service->getById($id);
        $this->assertSame('Técnico Oliveira', $item['equipe']);

        // Update hora_inicio, hora_saida, placa
        $this->service->updateField($id, 'hora_inicio', '09:00');
        $this->service->updateField($id, 'hora_saida', '18:00');
        $this->service->updateField($id, 'placa', 'TBO-9J53');
        $itemUpdated = $this->service->getById($id);
        $this->assertSame('09:00', $itemUpdated['hora_inicio']);
        $this->assertSame('18:00', $itemUpdated['hora_saida']);
        $this->assertSame('TBO-9J53', $itemUpdated['placa']);

        // N/A sets null
        $resNa = $this->service->updateField($id, 'os', 'N/A');
        $this->assertNull($resNa['value']);
        $item = $this->service->getById($id);
        $this->assertNull($item['os']);

        // Invalid field throws
        $this->expectException(\InvalidArgumentException::class);
        $this->service->updateField($id, 'unknown_field', 'test');
    }

    public function testAppendObsSuccessAndValidation(): void
    {
        $user = ['id' => 1, 'nome' => 'Lucas', 'role' => 'supervisor'];
        $created = $this->service->create(['site' => 'S1'], $user);
        $id = $created['id'];

        // 1st append
        $res1 = $this->service->appendObs($id, 'Primeira checagem no local', $user);
        $this->assertStringContainsString('Lucas (supervisor): Primeira checagem no local', $res1['obs']);

        // 2nd append accumulates with \n\n
        $res2 = $this->service->appendObs($id, 'Segunda checagem', $user);
        $this->assertStringContainsString("Primeira checagem no local\n\n", $res2['obs']);
        $this->assertStringContainsString('Lucas (supervisor): Segunda checagem', $res2['obs']);
    }

    public function testAppendObsEmptyThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];
        $created = $this->service->create([], $user);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->appendObs($created['id'], '   ', $user);
    }

    public function testAppendObsTooLongThrows(): void
    {
        $user = ['id' => 1, 'role' => 'admin'];
        $created = $this->service->create([], $user);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->appendObs($created['id'], str_repeat('a', 1001), $user);
    }

    public function testChangeStatusLogsToObs(): void
    {
        $user = ['id' => 1, 'nome' => 'Admin', 'role' => 'admin'];
        $created = $this->service->create(['status' => 'Pendente'], $user);
        $id = $created['id'];

        $res = $this->service->changeStatus($id, 'Em andamento', $user);
        $this->assertSame('Em andamento', $res['status']);
        $this->assertStringContainsString("Status alterado para 'Em andamento'", $res['obs']);

        // Invalid status throws
        $this->expectException(\InvalidArgumentException::class);
        $this->service->changeStatus($id, 'Status Nao Existe', $user);
    }

    public function testDeletePermissions(): void
    {
        $db = \App\Config\Database::connect();
        $resCoord = $db->query("SELECT id, role FROM usuarios WHERE role = 'coordenador' LIMIT 1");
        $coordRow = $resCoord ? $resCoord->fetch_assoc() : null;
        $owner = $coordRow ? ['id' => (int) $coordRow['id'], 'role' => $coordRow['role']] : ['id' => 7, 'role' => 'coordenador'];

        $resOther = $db->query("SELECT id, role FROM usuarios WHERE id NOT IN (1, {$owner['id']}) LIMIT 1");
        $otherRow = $resOther ? $resOther->fetch_assoc() : null;
        $otherUser = $otherRow ? ['id' => (int) $otherRow['id'], 'role' => $otherRow['role']] : ['id' => 3, 'role' => 'gerente'];

        $admin = ['id' => 1, 'role' => 'admin'];

        $lineByOwner = $this->service->create(['site' => 'OWNER_LINE'], $owner);
        $id = $lineByOwner['id'];

        // Other user cannot delete
        try {
            $this->service->delete($id, $otherUser);
            $this->fail('Should have thrown DomainException');
        } catch (\DomainException $e) {
            $this->assertStringContainsString('Acesso negado', $e->getMessage());
        }

        // Owner can delete
        $delOwner = $this->service->delete($id, $owner);
        $this->assertTrue($delOwner);

        // Admin can delete any
        $line2 = $this->service->create(['site' => 'ANOTHER_LINE'], $owner);
        $delAdmin = $this->service->delete($line2['id'], $admin);
        $this->assertTrue($delAdmin);
    }
}
