<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Auth\AuthService;
use App\Api\Controllers\InventoryController;
use App\Api\Helpers\Request;
use App\Api\Helpers\Response;
use App\Api\Middleware\RateLimitMiddleware;
use App\Api\Services\InventoryService;
use PHPUnit\Framework\TestCase;

class InventoryControllerTest extends TestCase
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

    private function createMockService(): InventoryService
    {
        return $this->createMock(InventoryService::class);
    }

    public function testListReturnsDefaultFilters(): void
    {
        $service = $this->createMockService();
        $expectedFilters = [
            'search' => '',
            'status' => '',
            'categoria' => ''
        ];

        $service->expects($this->once())
            ->method('list')
            ->with($expectedFilters, 20, 0)
            ->willReturn([
                'success' => true,
                'data' => [
                    ['id' => 1, 'material_nome' => 'Item 1']
                ],
                'total' => 1
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertCount(1, $json['data']);
        $this->assertSame(1, $json['total']);
        $this->assertSame(200, http_response_code());
    }

    public function testListRespectsQueryParams(): void
    {
        $_GET['search'] = 'furadeira';
        $_GET['status'] = 'em_posse';
        $_GET['categoria'] = 'ferramenta';
        $_GET['limit'] = '10';
        $_GET['offset'] = '5';

        $service = $this->createMockService();
        $expectedFilters = [
            'search' => 'furadeira',
            'status' => 'em_posse',
            'categoria' => 'ferramenta'
        ];

        $service->expects($this->once())
            ->method('list')
            ->with($expectedFilters, 10, 5)
            ->willReturn([
                'success' => true,
                'data' => [],
                'total' => 0
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(0, $json['total']);
        $this->assertSame(200, http_response_code());
    }

    public function testGetByIdSuccess(): void
    {
        $_GET['action'] = 'get';
        $_GET['id'] = '10';

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('get')
            ->with(10)
            ->willReturn([
                'success' => true,
                'data' => [
                    'id' => 10,
                    'material_nome' => 'Alicate Universal',
                    'serial' => 'SN1234'
                ]
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(10, $json['data']['id']);
        $this->assertSame(200, http_response_code());
    }

    public function testGetByIdNotFound(): void
    {
        $_GET['action'] = 'get';
        $_GET['id'] = '999';

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('get')
            ->with(999)
            ->willReturn([
                'success' => false,
                'message' => 'Item de inventário não encontrado.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertFalse($json['success']);
        $this->assertSame(404, http_response_code());
    }

    public function testGetTechnicians(): void
    {
        $_GET['action'] = 'technicians';

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('getTechnicians')
            ->willReturn([
                'success' => true,
                'data' => ['Carlos Silva', 'Marcos Oliveira']
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(['Carlos Silva', 'Marcos Oliveira'], $json['data']);
        $this->assertSame(200, http_response_code());
    }

    public function testPostCreateSuccessWithUserArray(): void
    {
        $payload = [
            'categoria' => 'ferramenta',
            'tecnico_nome' => 'Carlos Silva',
            'material_nome' => 'Furadeira',
            'modelo' => 'DWD520',
            'serial' => 'SN123',
            'data_retirada' => '2026-09-19'
        ];
        Request::setMockBody($payload);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('create')
            ->with($payload, 2)
            ->willReturn([
                'success' => true,
                'message' => 'Item cadastrado com sucesso.',
                'data' => ['id' => 42]
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('POST', ['id' => 2, 'role' => 'supervisor']);
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(42, $json['data']['id']);
        $this->assertSame(201, http_response_code());
    }

    public function testPostCreateSuccessWithUserObject(): void
    {
        $payload = [
            'categoria' => 'veiculo',
            'tecnico_nome' => 'Marcos',
            'material_nome' => 'Fiat Strada',
            'modelo' => '1.4',
            'serial' => 'ABC1234',
            'data_retirada' => '2026-09-19'
        ];
        Request::setMockBody($payload);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('create')
            ->with($payload, 5)
            ->willReturn([
                'success' => true,
                'message' => 'Item cadastrado com sucesso.',
                'data' => ['id' => 50]
            ]);

        $controller = new InventoryController($service);

        $userObj = (object)['user_id' => 5, 'role' => 'coordenador'];

        ob_start();
        $controller->handle('POST', $userObj);
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(50, $json['data']['id']);
        $this->assertSame(201, http_response_code());
    }

    public function testPostCreateValidationFails(): void
    {
        Request::setMockBody([]);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('create')
            ->willReturn([
                'success' => false,
                'message' => 'Campos obrigatórios não preenchidos: tecnico_nome.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('POST', ['id' => 1]);
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertFalse($json['success']);
        $this->assertSame(400, http_response_code());
    }

    public function testPutUpdateSuccessWithQueryId(): void
    {
        $_GET['id'] = '12';
        $payload = ['material_nome' => 'Chave Philips Atualizada'];
        Request::setMockBody($payload);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('update')
            ->with(12, $payload)
            ->willReturn([
                'success' => true,
                'message' => 'Item atualizado com sucesso.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('PUT');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(200, http_response_code());
    }

    public function testPutUpdateSuccessWithBodyId(): void
    {
        unset($_GET['id']);
        $payload = ['id' => 15, 'material_nome' => 'Multímetro Digital'];
        Request::setMockBody($payload);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('update')
            ->with(15, $payload)
            ->willReturn([
                'success' => true,
                'message' => 'Item atualizado com sucesso.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('PUT');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(200, http_response_code());
    }

    public function testPutUpdateFails(): void
    {
        $_GET['id'] = '999';
        $payload = ['material_nome' => 'Nao Existe'];
        Request::setMockBody($payload);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('update')
            ->with(999, $payload)
            ->willReturn([
                'success' => false,
                'message' => 'Item não encontrado para atualização.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('PUT');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertFalse($json['success']);
        $this->assertSame(400, http_response_code());
    }

    public function testDeleteSuccessWithQueryId(): void
    {
        $_GET['id'] = '8';

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('delete')
            ->with(8)
            ->willReturn([
                'success' => true,
                'message' => 'Item excluído com sucesso.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('DELETE');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(200, http_response_code());
    }

    public function testDeleteSuccessWithBodyId(): void
    {
        unset($_GET['id']);
        Request::setMockBody(['id' => 9]);

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('delete')
            ->with(9)
            ->willReturn([
                'success' => true,
                'message' => 'Item excluído com sucesso.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('DELETE');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertSame(200, http_response_code());
    }

    public function testDeleteFails(): void
    {
        $_GET['id'] = '999';

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('delete')
            ->with(999)
            ->willReturn([
                'success' => false,
                'message' => 'Item não encontrado para exclusão.'
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('DELETE');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertFalse($json['success']);
        $this->assertSame(400, http_response_code());
    }

    public function testMethodNotAllowed(): void
    {
        $service = $this->createMockService();
        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('PATCH');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertFalse($json['success']);
        $this->assertSame(405, http_response_code());
    }

    public function testActionMethodsDirectInvocation(): void
    {
        $service = $this->createMockService();
        $service->expects($this->exactly(2))
            ->method('list')
            ->willReturn(['success' => true, 'data' => [], 'total' => 0]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->list();
        ob_get_clean();

        ob_start();
        $controller->index();
        ob_get_clean();

        $this->assertSame(200, http_response_code());
    }

    public function testAuthServicePermissionsForInventory(): void
    {
        $admin = (object)['role' => 'admin'];
        $coordenador = (object)['role' => 'coordenador'];
        $supervisor = (object)['role' => 'supervisor'];
        $administrativo = (object)['role' => 'administrativo'];
        $cliente = (object)['role' => 'cliente'];

        // Admin can do all
        $this->assertTrue(AuthService::requireRole($admin, 'inventory', 'GET', null));
        $this->assertTrue(AuthService::requireRole($admin, 'inventory', 'POST', null));
        $this->assertTrue(AuthService::requireRole($admin, 'inventory', 'PUT', null));
        $this->assertTrue(AuthService::requireRole($admin, 'inventory', 'DELETE', null));

        // Coordenador can do all
        $this->assertTrue(AuthService::requireRole($coordenador, 'inventory', 'GET', null));
        $this->assertTrue(AuthService::requireRole($coordenador, 'inventory', 'POST', null));
        $this->assertTrue(AuthService::requireRole($coordenador, 'inventory', 'PUT', null));
        $this->assertTrue(AuthService::requireRole($coordenador, 'inventory', 'DELETE', null));

        // Supervisor can do all
        $this->assertTrue(AuthService::requireRole($supervisor, 'inventory', 'GET', null));
        $this->assertTrue(AuthService::requireRole($supervisor, 'inventory', 'POST', null));
        $this->assertTrue(AuthService::requireRole($supervisor, 'inventory', 'PUT', null));
        $this->assertTrue(AuthService::requireRole($supervisor, 'inventory', 'DELETE', null));

        // Administrativo denied
        $this->assertFalse(AuthService::requireRole($administrativo, 'inventory', 'GET', null));
        $this->assertFalse(AuthService::requireRole($administrativo, 'inventory', 'POST', null));

        // Cliente denied
        $this->assertFalse(AuthService::requireRole($cliente, 'inventory', 'GET', null));
        $this->assertFalse(AuthService::requireRole($cliente, 'inventory', 'POST', null));
    }

    public function testRateLimitMiddlewareIncludesInventoryLimits(): void
    {
        $ref = new \ReflectionClass(RateLimitMiddleware::class);
        $constants = $ref->getConstants();
        $limits = $constants['LIMITS'] ?? [];

        $this->assertArrayHasKey('inventory', $limits);
        $this->assertArrayHasKey('POST', $limits['inventory']);
        $this->assertArrayHasKey('PUT', $limits['inventory']);
        $this->assertArrayHasKey('DELETE', $limits['inventory']);
    }

    public function testExportCsvActionReturnsFilteredItems(): void
    {
        $_GET['action'] = 'export-csv';
        $_GET['search'] = 'Strada';
        $_GET['status'] = 'em_posse';
        $_GET['categoria'] = 'veiculo';

        $expectedFilters = [
            'search' => 'Strada',
            'status' => 'em_posse',
            'categoria' => 'veiculo'
        ];

        $service = $this->createMockService();
        $service->expects($this->once())
            ->method('list')
            ->with($expectedFilters, 10000, 0)
            ->willReturn([
                'success' => true,
                'data' => [
                    ['id' => 1, 'material_nome' => 'Fiat Strada', 'serial' => 'BRA2E19']
                ],
                'total' => 1
            ]);

        $controller = new InventoryController($service);

        ob_start();
        $controller->handle('GET');
        $output = ob_get_clean();

        $json = json_decode($output, true);
        $this->assertTrue($json['success']);
        $this->assertCount(1, $json['data']);
        $this->assertEquals('Fiat Strada', $json['data'][0]['material_nome']);
    }
}
