<?php

namespace Tests\Unit;

use App\Api\Services\PreditivaParseService;
use PHPUnit\Framework\TestCase;

/**
 * Auditoria 2026-10-16 (Fase 1): stderr do parser Python (2>&1 no exec)
 * era devolvido cru ao cliente — vazava paths absolutos, traceback e
 * detalhes do ambiente. Agora: log completo no servidor, resposta
 * sanitizada (JSON error controlado ou mensagem generica).
 */
class PreditivaParseServiceSanitizeTest extends TestCase
{
    public function testSanitizeParserErrorExtractsJsonErrorMessage(): void
    {
        $raw = "{\"success\":true}\n{\"success\": false, \"error\": \"Planilha sem coluna CLIMA\"}";
        $result = PreditivaParseService::sanitizeParserError($raw);

        $this->assertSame('Planilha sem coluna CLIMA', $result);
    }

    public function testSanitizeParserErrorStripsAbsolutePathsWithPaths(): void
    {
        $raw = '{"success": false, "error": "Permission denied: /var/www/html/OS/upload_2026.xlsx"}';
        $result = PreditivaParseService::sanitizeParserError($raw);

        $this->assertStringNotContainsString('/var/www/html', $result);
        $this->assertStringContainsString('upload_2026.xlsx', $result);
    }

    public function testSanitizeParserErrorReturnsGenericMessageForRawTraceback(): void
    {
        $raw = "Traceback (most recent call last):\n"
            . '  File "/var/www/html/app/api/Services/preditiva_parser.py", line 190, in main'
            . "\nValueError: bad zip file";

        $result = PreditivaParseService::sanitizeParserError($raw);

        $this->assertStringNotContainsString('Traceback', $result);
        $this->assertStringNotContainsString('preditiva_parser.py', $result);
        $this->assertStringNotContainsString('/var/www', $result);
        $this->assertNotSame('', $result);
    }

    public function testSanitizeParserErrorStripsControlCharsAndTruncates(): void
    {
        $raw = '{"success": false, "error": "' . str_repeat('A', 500) . "\x00\x1b[31m\"}";
        $result = PreditivaParseService::sanitizeParserError($raw);

        $this->assertStringNotContainsString("\x00", $result);
        $this->assertLessThanOrEqual(301, strlen($result));
    }

    public function testProcessFailureDoesNotLeakStderrPaths(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'preditiva_corrupt_') . '.xlsx';
        file_put_contents($tmp, 'not-a-real-xlsx');

        try {
            $service = new PreditivaParseService();
            $result = $service->process($tmp);

            $this->assertFalse($result['success']);
            $this->assertStringNotContainsString('Traceback', $result['message']);
            $this->assertStringNotContainsString('/var/www', $result['message']);
            $this->assertStringNotContainsString('File "', $result['message']);
        } finally {
            @unlink($tmp);
        }
    }
}
