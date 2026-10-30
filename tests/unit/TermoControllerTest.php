<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Controllers\TermoController;
use App\Api\Services\TermoService;

class TermoControllerTest extends TestCase
{
    private TermoController $controller;
    private $serviceMock;

    protected function setUp(): void
    {
        $this->serviceMock = $this->createMock(TermoService::class);
        $this->controller = new TermoController($this->serviceMock);
    }

    public function testControllerInstantiation(): void
    {
        $this->assertInstanceOf(TermoController::class, $this->controller);
    }

    public function testRejectsMismatchedActionOnGetPublicSign(): void
    {
        $_GET['action'] = 'public-sign';
        $this->serviceMock->expects($this->never())->method('list');
        $this->serviceMock->expects($this->never())->method('signPublicTermo');

        // We capture output
        ob_start();
        $this->controller->handle('GET', null);
        $output = ob_get_clean();
        $data = json_decode($output, true);

        $this->assertFalse($data['success']);
        $this->assertStringContainsString('inválida', $data['message']);
    }

    public function testRejectsUnauthenticatedCreateAction(): void
    {
        $_GET['action'] = 'create';
        $this->serviceMock->expects($this->never())->method('createTermo');

        ob_start();
        $this->controller->handle('POST', null);
        $output = ob_get_clean();
        $data = json_decode($output, true);

        $this->assertFalse($data['success']);
        $this->assertStringContainsString('Autenticação', $data['message']);
    }

    public function testHandlesDeleteActionWithAdminRole(): void
    {
        $_GET['id'] = '10';
        $user = (object) ['id' => 1, 'role' => 'admin'];

        $this->serviceMock->expects($this->once())
            ->method('deleteTermo')
            ->with(10, true)
            ->willReturn(['success' => true, 'message' => 'Termo excluído com sucesso.']);

        ob_start();
        $this->controller->handle('DELETE', $user);
        $output = ob_get_clean();
        $data = json_decode($output, true);

        $this->assertTrue($data['success']);
        $this->assertStringContainsString('excluído com sucesso', $data['message']);
    }
}
