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
}
