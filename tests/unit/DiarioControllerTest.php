<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Controllers\DiarioController;
use App\Api\Services\DiarioService;
use App\Api\Auth\AuthService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;

class DiarioControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Response::$exitEnabled = false;
        $_GET = [];
        $_SERVER = [];
        Request::setMockBody(null);
    }

    protected function tearDown(): void
    {
        Response::$exitEnabled = true;
        Request::setMockBody(null);
        $_GET = [];
        $_SERVER = [];
        parent::tearDown();
    }

    public function testListAllCallsService(): void
    {
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('listAll')
            ->willReturn(['items' => [['id' => 1, 'site' => 'BMA']], 'total' => 1]);

        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->listAll();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertTrue($json['success']);
        $this->assertSame(1, $json['data']['total']);
    }

    public function testLookupOsCallsService(): void
    {
        $_GET['os'] = 'OS123';
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('lookupOs')
            ->with('OS123')
            ->willReturn('Observação prévia da OS');

        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->lookupOs();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertTrue($json['success']);
        $this->assertSame('Observação prévia da OS', $json['data']['obs']);
    }

    public function testCreateCallsService(): void
    {
        Request::setMockBody(['site' => 'BMA', 'categoria' => 'corretiva']);
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('create')
            ->willReturn(['id' => 42, 'item' => ['id' => 42, 'site' => 'BMA']]);

        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->create();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertTrue($json['success']);
        $this->assertSame(42, $json['data']['id']);
    }

    public function testUpdateFieldValidatesParams(): void
    {
        Request::setMockBody(['id' => 'not-a-number', 'field' => 'site', 'value' => 'BMA']);
        $mockService = $this->createMock(DiarioService::class);
        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->updateField();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertFalse($json['success']);
        $this->assertStringContainsString('Campo id obrigatório', $json['message']);
    }

    public function testAppendObsSuccess(): void
    {
        Request::setMockBody(['id' => 10, 'texto' => 'Nova observação']);
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('appendObs')
            ->with(10, 'Nova observação')
            ->willReturn(['id' => 10, 'obs' => 'texto']);

        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->appendObs();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertTrue($json['success']);
    }

    public function testChangeStatusSuccess(): void
    {
        Request::setMockBody(['id' => 10, 'status' => 'Concluído']);
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('changeStatus')
            ->with(10, 'Concluído')
            ->willReturn(['id' => 10, 'status' => 'Concluído', 'obs' => '...']);

        $controller = new DiarioController(['id' => 1, 'role' => 'admin'], $mockService);

        ob_start();
        $controller->changeStatus();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertTrue($json['success']);
    }

    public function testDeleteDomainExceptionReturns403(): void
    {
        Request::setMockBody(['id' => 10]);
        $mockService = $this->createMock(DiarioService::class);
        $mockService->expects($this->once())
            ->method('delete')
            ->willThrowException(new \DomainException('Acesso negado: você só pode excluir linhas criadas por você.'));

        $controller = new DiarioController(['id' => 2, 'role' => 'supervisor'], $mockService);

        ob_start();
        $controller->delete();
        $out = ob_get_clean();

        $json = json_decode($out, true);
        $this->assertFalse($json['success']);
        $this->assertStringContainsString('Acesso negado', $json['message']);
    }

    public function testAuthServicePermissions(): void
    {
        $admin = (object) ['role' => 'admin', 'id' => 1];
        $supervisor = (object) ['role' => 'supervisor', 'id' => 2];
        $coordenador = (object) ['role' => 'coordenador', 'id' => 3];
        $gerente = (object) ['role' => 'gerente', 'id' => 4];
        $administrativo = (object) ['role' => 'administrativo', 'id' => 5];
        $cliente = (object) ['role' => 'cliente', 'id' => 6];

        // Allowed roles can read and write
        foreach ([$admin, $supervisor, $coordenador, $gerente] as $u) {
            $this->assertTrue(AuthService::requireRole($u, 'diario', 'GET', null), "Role {$u->role} should have read access");
            $this->assertTrue(AuthService::requireRole($u, 'diario', 'POST', null), "Role {$u->role} should have write access");
            $this->assertTrue(AuthService::requireRole($u, 'diario', 'PUT', null), "Role {$u->role} should have write access");
            $this->assertTrue(AuthService::requireRole($u, 'diario', 'PATCH', null), "Role {$u->role} should have write access");
            $this->assertTrue(AuthService::requireRole($u, 'diario', 'DELETE', null), "Role {$u->role} should have delete access");
        }

        // Disallowed roles cannot read or write
        foreach ([$administrativo, $cliente] as $u) {
            $this->assertFalse(AuthService::requireRole($u, 'diario', 'GET', null), "Role {$u->role} should NOT have read access");
            $this->assertFalse(AuthService::requireRole($u, 'diario', 'POST', null), "Role {$u->role} should NOT have write access");
            $this->assertFalse(AuthService::requireRole($u, 'diario', 'DELETE', null), "Role {$u->role} should NOT have delete access");
        }
    }
}
