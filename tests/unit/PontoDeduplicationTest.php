<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Repositories\PontoRepository;
use PHPUnit\Framework\TestCase;

class PontoDeduplicationTest extends TestCase
{
    private PontoRepository $repo;
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new PontoRepository();
        $this->tempDir = sys_get_temp_dir() . '/rubble_dedup_test_' . uniqid();
        mkdir($this->tempDir, 0777, true);
    }

    protected function tearDown(): void
    {
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

    public function testColaboradorIsNotDuplicatedWhenNameMatches(): void
    {
        $uniqueName = 'Deduplication Test Colab ' . uniqid();

        // 1. Insert first with generated/temporary matricula
        $id1 = $this->repo->upsertColaborador([
            'matricula' => 'TF_' . substr(md5($uniqueName), 0, 8),
            'nome' => $uniqueName,
            'cc' => 'CC_ORIGINAL',
            'funcao' => 'Tecnico 1',
        ]);
        $this->assertGreaterThan(0, $id1);

        // 2. Insert second with real matricula and same name
        $id2 = $this->repo->upsertColaborador([
            'matricula' => 'REAL_' . rand(1000, 9999),
            'nome' => $uniqueName,
            'cc' => 'CC_NOVO',
            'funcao' => 'Tecnico Senior',
        ]);

        $this->assertSame($id1, $id2, 'Must return the same collaborator ID to avoid duplicates');

        // Verify only 1 record exists with this name
        $found = $this->repo->findColaboradorByNome($uniqueName);
        $this->assertNotNull($found);
        $this->assertSame($id1, (int) $found['id']);
        $this->assertStringStartsWith('REAL_', $found['matricula'], 'Matricula must be upgraded to real');
    }

    public function testRegistroPontoIsNotDuplicatedOnSameColaboradorAndDate(): void
    {
        $uniqueName = 'Deduplication Reg Test ' . uniqid();
        $colabId = $this->repo->upsertColaborador([
            'matricula' => 'DEDUP_REG_' . rand(1000, 9999),
            'nome' => $uniqueName,
        ]);

        $date = '2026-11-15';

        // 1. First insert
        $regId1 = $this->repo->upsertRegistro([
            'colaborador_id' => $colabId,
            'data' => $date,
            'dia_semana' => 'Dom',
            'e1' => '08:00',
            's1' => '17:00',
            'he' => '02:00',
            'he_min' => 120,
        ]);
        $this->assertGreaterThan(0, $regId1);

        // 2. Second insert with updated batidas
        $regId2 = $this->repo->upsertRegistro([
            'colaborador_id' => $colabId,
            'data' => $date,
            'dia_semana' => 'Dom',
            'e1' => '08:00',
            's1' => '18:00',
            'he' => '03:00',
            'he_min' => 180,
        ]);

        $this->assertSame($regId1, $regId2, 'Must update existing record, never duplicate');

        // Verify extrato returns only 1 row
        $extrato = $this->repo->getExtratoColaborador($colabId, $date, $date);
        $this->assertCount(1, $extrato, 'Must have exactly 1 record for this day');
        $this->assertSame('18:00', $extrato[0]['s1']);
        $this->assertSame('03:00', $extrato[0]['he']);
    }

    public function testMigrationScriptIsIdempotentOnConsecutiveRuns(): void
    {
        $testColabName = 'Idempotency Script Colab ' . uniqid();
        $testMatricula = 'IDEMP_' . rand(1000, 9999);

        // Create mock fixtures
        $resumoMock = [
            'ok' => true,
            'linhas' => [
                [
                    'nome' => $testColabName,
                    'matricula' => $testMatricula,
                    'cc' => 'CC_IDEMP',
                    'saldo_atual' => '04:00',
                    'he_total' => '06:00',
                    'absent_total' => '02:00',
                ],
            ],
        ];
        file_put_contents($this->tempDir . '/resumo_banco_horas_pdf.json', json_encode($resumoMock));

        $anotacoesMock = [
            "horas_extras_simplificadas|CC_IDEMP|{$testColabName}|2026-11-16|Seg" => [
                'nome_gestor' => 'Gestor Dedup',
                'adm_responsavel' => 'ADM Dedup',
                'sobreaviso' => 'Não',
                'justificativa' => 'Hora extra preventiva',
            ],
        ];
        file_put_contents($this->tempDir . '/anotacoes_operacionais.json', json_encode($anotacoesMock));

        $scriptPath = __DIR__ . '/../../app/api/Cron/migrate_tempo_fechado_to_mariadb.php';
        $cmd = sprintf('php %s --data-dir=%s 2>&1', escapeshellarg($scriptPath), escapeshellarg($this->tempDir));

        // First run
        $out1 = [];
        $code1 = 0;
        exec($cmd, $out1, $code1);
        $this->assertSame(0, $code1);

        $colab = $this->repo->findColaboradorByNome($testColabName);
        $this->assertNotNull($colab);
        $colabId = (int) $colab['id'];

        // Second run (simulating next day or repeated cron)
        $out2 = [];
        $code2 = 0;
        exec($cmd, $out2, $code2);
        $this->assertSame(0, $code2);
        $outputStr2 = implode("\n", $out2);

        // Verify that same collaborator ID exists and was not duplicated
        $colabAfter = $this->repo->findColaboradorByNome($testColabName);
        $this->assertSame($colabId, (int) $colabAfter['id']);

        // Verify database counts to prove zero duplication
        $db = \App\Config\Database::connect();
        $stmtC = $db->prepare('SELECT COUNT(*) as cnt FROM ponto_colaboradores WHERE LOWER(nome) = LOWER(?)');
        $stmtC->bind_param('s', $testColabName);
        $stmtC->execute();
        $cntColab = (int) $stmtC->get_result()->fetch_assoc()['cnt'];
        $stmtC->close();
        $this->assertSame(1, $cntColab, 'Colaborador table must have exactly 1 record, zero duplicate');

        $stmtBh = $db->prepare('SELECT COUNT(*) as cnt FROM ponto_banco_horas WHERE colaborador_id = ?');
        $stmtBh->bind_param('i', $colabId);
        $stmtBh->execute();
        $cntBh = (int) $stmtBh->get_result()->fetch_assoc()['cnt'];
        $stmtBh->close();
        $this->assertSame(1, $cntBh, 'Banco de horas table must have exactly 1 record, zero duplicate');

        $stmtHe = $db->prepare('SELECT COUNT(*) as cnt FROM ponto_anotacoes_he WHERE colaborador_id = ? AND data = "2026-11-16"');
        $stmtHe->bind_param('i', $colabId);
        $stmtHe->execute();
        $cntHe = (int) $stmtHe->get_result()->fetch_assoc()['cnt'];
        $stmtHe->close();
        $this->assertSame(1, $cntHe, 'Anotacoes HE table must have exactly 1 record, zero duplicate');

        // Check console output reports no duplicates
        $this->assertStringContainsString('Migração concluída com sucesso no MariaDB!', $outputStr2);
    }
}
