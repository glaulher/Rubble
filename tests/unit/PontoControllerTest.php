<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Controllers\PontoController;
use App\Api\Helpers\Response;
use App\Api\Services\PontoService;
use PHPUnit\Framework\TestCase;

class PontoControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Response::$exitEnabled = false;
        $_GET = [];
        $_POST = [];
        $_FILES = [];
        // Clear any previous buffered headers/output
        if (ob_get_level()) {
            ob_clean();
        }
    }

    public function testGetBancoHorasReturnsJson(): void
    {
        $mockService = $this->createMock(PontoService::class);
        $mockService->expects($this->once())
            ->method('getBancoHoras')
            ->willReturn([
                'kpis' => ['colaboradores' => 2],
                'dados' => [],
            ]);

        $controller = new PontoController($mockService);

        ob_start();
        $controller->getBancoHoras();
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertIsArray($decoded);
        $this->assertSame(2, $decoded['kpis']['colaboradores']);
    }

    public function testGetExtratoRequiresColaboradorId(): void
    {
        $mockService = $this->createMock(PontoService::class);
        $controller = new PontoController($mockService);

        $_GET['colaborador_id'] = '0';

        ob_start();
        $controller->getExtrato();
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertStringContainsString('colaborador', strtolower($decoded['message']));
    }

    public function testSaveAnotacaoHeValidatesInput(): void
    {
        $mockService = $this->createMock(PontoService::class);
        $controller = new PontoController($mockService);

        // Missing data or invalid payload
        ob_start();
        $controller->saveAnotacaoHe();
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
    }

    public function testGetFilterOptionsReturnsData(): void
    {
        $mockService = $this->createMock(PontoService::class);
        $mockService->expects($this->once())
            ->method('getFilterOptions')
            ->willReturn([
                'centros_de_custo' => ['1040', '1050'],
                'colaboradores' => [],
            ]);

        $controller = new PontoController($mockService);

        ob_start();
        $controller->getFilterOptions();
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertSame(['1040', '1050'], $decoded['centros_de_custo']);
    }
}
