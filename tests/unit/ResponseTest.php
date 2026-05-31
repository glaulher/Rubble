<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ResponseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        http_response_code(200);
    }

    public function testOutputJsonSetsStatusCode(): void
    {
        ResponseTestHelper::callOutputJson([], 201);
        $this->assertSame(201, http_response_code());
    }

    public function testOutputJsonDefaultsTo200(): void
    {
        ResponseTestHelper::callOutputJson([]);
        $this->assertSame(200, http_response_code());
    }

    public function testOutputJsonProducesValidJson(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson(['test' => true], 200);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertIsArray($decoded);
        $this->assertTrue($decoded['test']);
    }

    public function testOutputJsonUnicodeNotEscaped(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson(['msg' => 'çáéíóú'], 200);
        $output = ob_get_clean();

        $this->assertStringContainsString('çáéíóú', $output);
    }

    // --- success ---

    public function testSuccessStructure(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => true,
            'message' => 'Operação concluída',
            'data' => ['id' => 1],
        ]);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertTrue($decoded['success']);
        $this->assertSame('Operação concluída', $decoded['message']);
        $this->assertSame(['id' => 1], $decoded['data']);
    }

    public function testSuccessWithEmptyData(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => true,
            'message' => 'Sucesso',
            'data' => [],
        ]);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertTrue($decoded['success']);
        $this->assertSame([], $decoded['data']);
    }

    // --- error ---

    public function testErrorStructure(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'Erro interno',
        ], 500);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertSame('Erro interno', $decoded['message']);
        $this->assertArrayNotHasKey('data', $decoded);
        $this->assertSame(500, http_response_code());
    }

    // --- validation ---

    public function testValidationStructure(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'Campo inválido',
        ], 400);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertSame('Campo inválido', $decoded['message']);
    }

    // --- notFound ---

    public function testNotFoundStructure(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'PV não encontrada',
        ], 404);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertSame('PV não encontrada', $decoded['message']);
    }

    public function testNotFoundDefaultMessage(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'Recurso não encontrado',
        ], 404);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertSame('Recurso não encontrado', $decoded['message']);
    }

    // --- unauthorized ---

    public function testUnauthorizedStructure(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'Acesso negado',
        ], 401);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertSame('Acesso negado', $decoded['message']);
    }

    public function testUnauthorizedDefaultMessage(): void
    {
        ob_start();
        ResponseTestHelper::callOutputJson([
            'success' => false,
            'message' => 'Não autorizado',
        ], 401);
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertSame('Não autorizado', $decoded['message']);
    }
}
