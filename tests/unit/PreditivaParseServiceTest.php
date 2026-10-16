<?php

namespace Tests\Unit;

use App\Api\Services\PreditivaParseService;
use PHPUnit\Framework\TestCase;

class PreditivaParseServiceTest extends TestCase
{
    private string $climaPath;
    private string $templatePath;

    protected function setUp(): void
    {
        $this->climaPath = realpath(__DIR__ . '/../../CLIMA_20261610.xlsx') ?: '';
        $this->templatePath = realpath(__DIR__ . '/../../Preditiva_parse.xlsx') ?: '';
    }

    public function testProcessReturnsErrorIfClimaNotFound(): void
    {
        $service = new PreditivaParseService();
        $result = $service->process('/caminho/inexistente/clima.xlsx');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('não encontrado', $result['message']);
    }

    public function testProcessWithRealFilesGeneratesOutputAndStats(): void
    {
        $service = new PreditivaParseService();
        $result = $service->process($this->climaPath, $this->templatePath);

        $this->assertTrue($result['success'], $result['message'] ?? 'Erro no processamento');
        $this->assertFileExists($result['output_path']);
        $this->assertIsArray($result['stats']);
        $this->assertEquals(304, $result['stats']['total_rows']);
        $this->assertGreaterThanOrEqual(200, $result['stats']['matched_rows']);

        // Limpa arquivo gerado no teste
        if (file_exists($result['output_path'])) {
            unlink($result['output_path']);
        }
    }
}
