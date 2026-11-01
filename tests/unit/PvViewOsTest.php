<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Controllers\PvController;
use App\Api\Services\PvService;
use App\Api\Repositories\PvRepository;
use App\Api\Helpers\Response;

class PvViewOsTest extends TestCase
{
    private string $testPdfPath;

    protected function setUp(): void
    {
        parent::setUp();
        Response::$exitEnabled = false;
        http_response_code(200);

        if (!is_dir(PvRepository::OS_DIR)) {
            mkdir(PvRepository::OS_DIR, 0775, true);
        }

        $this->testPdfPath = PvRepository::OS_DIR . '/TESTOS123.pdf';
        file_put_contents($this->testPdfPath, '%PDF-1.4 TEST CONTENT');
    }

    protected function tearDown(): void
    {
        Response::$exitEnabled = true;
        if (file_exists($this->testPdfPath)) {
            unlink($this->testPdfPath);
        }
        parent::tearDown();
    }

    private function createController(): PvController
    {
        $mockService = $this->createMock(PvService::class);
        return new PvController($mockService);
    }

    public function testViewOsReturns400WhenOsMissing(): void
    {
        $_GET['os'] = '';
        $controller = $this->createController();

        ob_start();
        $controller->viewOs();
        $output = ob_get_clean();

        $this->assertSame(400, http_response_code());
        $data = json_decode($output, true);
        $this->assertFalse($data['success']);
    }

    public function testViewOsReturns404WhenOsFileNotFound(): void
    {
        $_GET['os'] = 'NONEXISTENT999';
        $controller = $this->createController();

        ob_start();
        $controller->viewOs();
        $output = ob_get_clean();

        $this->assertSame(404, http_response_code());
        $this->assertStringContainsString('PDF não encontrado', $output);
    }

    public function testViewOsStreamsPdfWhenFileExists(): void
    {
        $_GET['os'] = 'TESTOS123';
        $controller = $this->createController();

        ob_start();
        $controller->viewOs();
        $output = ob_get_clean();

        $this->assertSame(200, http_response_code());
        $this->assertSame('%PDF-1.4 TEST CONTENT', $output);
    }

    public function testAuthMiddlewareAcceptsBearerHeader(): void
    {
        $middleware = new \App\Api\Middleware\AuthMiddleware();
        $secret = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        putenv('JWT_SECRET=' . $secret);
        $_ENV['JWT_SECRET'] = $secret;

        $token = \App\Api\Auth\JwtHelper::encode(['user_id' => 1, 'role' => 'admin', 'username' => 'admin'], $secret);
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        $_GET['action'] = 'view-os';

        $middleware->handle('pv', 'GET');
        $this->assertNotNull($middleware->getUser());
        $this->assertSame(1, $middleware->getUser()->user_id);
    }
}
