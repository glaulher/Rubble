<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PontoMigrationTest extends TestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempDir = sys_get_temp_dir() . '/rubble_ponto_migration_test_' . uniqid();
        mkdir($this->tempDir, 0777, true);
    }

    protected function tearDown(): void
    {
        // Cleanup temp dir
        if (is_dir($this->tempDir)) {
            $files = glob($this->tempDir . '/*');
            foreach ($files as $f) {
                if (is_file($f)) {
                    @unlink($f);
                }
            }
            @rmdir($this->tempDir);
        }
        parent::tearDown();
    }

    public function testExcelExtractorReturnsErrorOnNonExistentFile(): void
    {
        $pythonScript = __DIR__ . '/../../app/api/Python/ponto_excel_extractor.py';
        $cmd = sprintf('python3 %s --file /non/existent/path.xlsx 2>&1', escapeshellarg($pythonScript));
        $out = [];
        $code = 0;
        exec($cmd, $out, $code);
        $outputStr = implode("\n", $out);
        $json = json_decode($outputStr, true);

        $this->assertIsArray($json);
        $this->assertFalse($json['ok']);
        $this->assertStringContainsString('não encontrado', $json['erro']);
    }

    public function testMigrationScriptRunsWithMockFixtures(): void
    {
        // 1. Create mock resumo_banco_horas_pdf.json
        $resumoMock = [
            'ok' => true,
            'linhas' => [
                [
                    'nome' => 'Colaborador Teste Migracao',
                    'matricula' => 'TEST_MIG_001',
                    'cc' => 'CC_TEST',
                    'funcao' => 'Tecnico Teste',
                    'turno' => 'Comercial',
                    'saldo_atual' => '05:30',
                    'he_total' => '10:00',
                    'absent_total' => '04:30',
                    'dias_com_he' => 3,
                    'dias_com_ausencia' => 1,
                ],
            ],
        ];
        file_put_contents($this->tempDir . '/resumo_banco_horas_pdf.json', json_encode($resumoMock));

        // 2. Create mock anotacoes_operacionais.json
        $anotacoesMock = [
            'horas_extras_simplificadas|CC_TEST|Colaborador Teste Migracao|2026-11-10|Ter' => [
                'nome_gestor' => 'Gestor Teste',
                'adm_responsavel' => 'ADM Teste',
                'sobreaviso' => 'Sim',
                'justificativa' => 'Atendimento emergencial de teste',
            ],
            'banco_horas|CC_TEST|Colaborador Teste Migracao||' => [
                'nome_gestor' => 'Gestor BH Teste',
                'adm_responsavel' => 'ADM BH Teste',
                'observacao' => 'Compensacao aprovada',
            ],
        ];
        file_put_contents($this->tempDir . '/anotacoes_operacionais.json', json_encode($anotacoesMock));

        // 3. Execute migrate_tempo_fechado_to_mariadb.php pointing to mock temp dir
        $scriptPath = __DIR__ . '/../../app/api/Cron/migrate_tempo_fechado_to_mariadb.php';
        $cmd = sprintf(
            'php %s --data-dir=%s 2>&1',
            escapeshellarg($scriptPath),
            escapeshellarg($this->tempDir)
        );

        $out = [];
        $code = 0;
        exec($cmd, $out, $code);
        $outputStr = implode("\n", $out);

        $this->assertSame(0, $code, "Script failed with output: {$outputStr}");
        $this->assertStringContainsString('MIGRAÇÃO DE DADOS: TEMPO FECHADO -> MARIADB', $outputStr);
        $this->assertStringContainsString('[FASE 1/3] Processando resumo do Banco de Horas', $outputStr);
        $this->assertStringContainsString('1 colaborador(es) cadastrados', $outputStr);
        $this->assertStringContainsString('[FASE 3/3] Processando anotações operacionais', $outputStr);
        $this->assertStringContainsString('1 anotação(ões) de Hora Extra vinculadas', $outputStr);
        $this->assertStringContainsString('1 anotação(ões) de Banco de Horas vinculadas', $outputStr);
        $this->assertStringContainsString('Migração concluída com sucesso no MariaDB!', $outputStr);
    }
}
