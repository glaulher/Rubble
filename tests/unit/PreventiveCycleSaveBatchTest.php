<?php

namespace Tests\Unit;

use App\Api\Repositories\PreventiveCycleRepository;
use App\Config\Database;
use mysqli;
use PHPUnit\Framework\TestCase;

class PreventiveCycleSaveBatchTest extends TestCase
{
    private mysqli $conn;
    private const CICLO = '2099-03';

    protected function setUp(): void
    {
        $this->conn = Database::connect();
        $this->conn->query("DELETE FROM preventive_cycle_items WHERE ciclo = '" . self::CICLO . "'");
        $this->ensureEquipment(14);
        $this->ensureEquipment(15);
    }

    protected function tearDown(): void
    {
        $this->conn->query("DELETE FROM preventive_cycle_items WHERE ciclo = '" . self::CICLO . "'");
    }

    private function ensureEquipment(int $id): void
    {
        $stmt = $this->conn->prepare(
            'INSERT IGNORE INTO equipamentos (id, local, equipamento) VALUES (?, ?, ?)'
        );
        $local = 'TESTE';
        $nome = 'Equipamento de teste ' . $id;
        $stmt->bind_param('iss', $id, $local, $nome);
        $stmt->execute();
        $stmt->close();
    }

    public function testSaveBatchAcceptsNullObservacaoAndScmNumber(): void
    {
        $repo = new PreventiveCycleRepository();
        $result = $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 14, 'checked' => true, 'observacao' => null, 'scm_number' => null],
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => 'obs', 'scm_number' => 'SCM-TEST'],
        ]);

        $this->assertGreaterThan(0, $result['saved']);

        $row = $this->fetch(self::CICLO, 14);
        $this->assertNull($row['observacao']);
        $this->assertNull($row['scm_number']);
    }

    public function testSaveBatchWithNullsDoesNotOverwriteExistingScmNumber(): void
    {
        $repo = new PreventiveCycleRepository();
        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => 'obs', 'scm_number' => 'SCM-TEST'],
        ]);

        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => null, 'scm_number' => null],
        ]);

        $row = $this->fetch(self::CICLO, 15);
        $this->assertSame('SCM-TEST', $row['scm_number']);
    }

    public function testSummaryExcludesScmNegado(): void
    {
        $repo = new PreventiveCycleRepository();

        $this->conn->query("DELETE FROM scm WHERE scm IN ('SCM-NEG', 'SCM-APR')");
        $stmt = $this->conn->prepare("INSERT INTO scm (scm, status) VALUES (?, ?)");
        $s1 = 'SCM-NEG';
        $st1 = 'SCM negado';
        $stmt->bind_param('ss', $s1, $st1);
        $stmt->execute();
        $s2 = 'SCM-APR';
        $st2 = 'SCM aprovado';
        $stmt->bind_param('ss', $s2, $st2);
        $stmt->execute();
        $stmt->close();

        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 14, 'checked' => true, 'observacao' => '', 'scm_number' => 'SCM-NEG'],
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => '', 'scm_number' => 'SCM-APR'],
        ]);

        $summary = $repo->summary(self::CICLO);
        $this->assertSame(1, $summary['checked_count']);

        $this->conn->query("DELETE FROM scm WHERE scm IN ('SCM-NEG', 'SCM-APR')");
    }

    public function testSummaryExcludesItemsWithObservationWhenHasObservacaoIsFalse(): void
    {
        $repo = new PreventiveCycleRepository();

        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 14, 'checked' => true, 'observacao' => 'defeito no compressor', 'scm_number' => null],
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $summary = $repo->summary(self::CICLO, false);
        $this->assertSame(1, $summary['checked_count'], 'summary() without observation filter deliberately excludes items with observations');

        $summaryWithObs = $repo->summary(self::CICLO, true);
        $this->assertSame(1, $summaryWithObs['checked_count'], 'summary() with hasObservacao=true must only include items with observations');
    }

    public function testAutoLinkScmsMatchesEquipmentAndUpdatesScmNumber(): void
    {
        $repo = new PreventiveCycleRepository();

        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-AUTO-01'");
        $this->conn->query("UPDATE equipamentos SET local = 'BMADTC', local_scm = 'BMADTC', equipamento = 'AR CONDICIONADO' WHERE id = 14");
        $stmt = $this->conn->prepare("INSERT INTO scm (scm, site, segmento, atividade, status, data_validacao) VALUES (?, ?, ?, ?, ?, ?)");
        $scm = 'SCM-AUTO-01';
        $site = 'BMADTC';
        $seg = 'PREVENTIVA ON GOING';
        $ativ = 'MANUTENÇÃO PREVENTIVA';
        $status = 'SCM aprovado';
        $dt = '2099-03-10';
        $stmt->bind_param('ssssss', $scm, $site, $seg, $ativ, $status, $dt);
        $stmt->execute();
        $stmt->close();

        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 14, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $linked = $repo->autoLinkScms(self::CICLO);
        $this->assertGreaterThanOrEqual(1, $linked);

        $row = $this->fetch(self::CICLO, 14);
        $this->assertSame('SCM-AUTO-01', $row['scm_number']);

        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-AUTO-01'");
    }

    public function testAutoLinkScmsDistinguishesMachinesByServicoAndNeverInsertsUnlaunched(): void
    {
        $repo = new PreventiveCycleRepository();

        $this->conn->query("DELETE FROM scm_items WHERE scm_id IN (SELECT id FROM scm WHERE scm = 'SCM-CHILLER-3')");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-CHILLER-3'");

        // Setup equipment 14 as CHILLER 1, equipment 15 as CHILLER 3 on same site
        $this->conn->query("UPDATE equipamentos SET local = 'CRT-TEST', local_scm = 'CRT-TEST', equipamento = 'CHILLER 1' WHERE id = 14");
        $this->conn->query("UPDATE equipamentos SET local = 'CRT-TEST', local_scm = 'CRT-TEST', equipamento = 'CHILLER 3' WHERE id = 15");

        $stmt = $this->conn->prepare("INSERT INTO scm (scm, site, segmento, atividade, status, data_validacao) VALUES (?, ?, ?, ?, ?, ?)");
        $scm = 'SCM-CHILLER-3';
        $site = 'CRT-TEST';
        $seg = 'PREVENTIVA ON GOING';
        $ativ = 'PREDITIVA DE CHILLER';
        $status = 'SCM aprovado';
        $dt = '2099-03-10';
        $stmt->bind_param('ssssss', $scm, $site, $seg, $ativ, $status, $dt);
        $stmt->execute();
        $scmId = $this->conn->insert_id;
        $stmt->close();

        // Insert item in scm_items explicitly specifying CHILLER 3
        $stmtItem = $this->conn->prepare("INSERT INTO scm_items (scm_id, servico) VALUES (?, ?)");
        $servico = '14 - CHILLER 3-3119B00469052-RJOCRT-CARRIER-30EVA1522';
        $stmtItem->bind_param('is', $scmId, $servico);
        $stmtItem->execute();
        $stmtItem->close();

        // Only launch CHILLER 3 (id 15). CHILLER 1 (id 14) is out of production / not launched!
        $repo->saveBatch(self::CICLO, [
            ['equipamento_id' => 15, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $linked = $repo->autoLinkScms(self::CICLO);
        $this->assertSame(1, $linked);

        // CHILLER 3 received the SCM
        $row15 = $this->fetch(self::CICLO, 15);
        $this->assertSame('SCM-CHILLER-3', $row15['scm_number']);

        // CHILLER 1 was NEVER launched, so it must not exist in preventive_cycle_items
        $row14 = $this->fetch(self::CICLO, 14);
        $this->assertNull($row14, 'Unlaunched equipment must NEVER be auto-inserted by autoLinkScms');

        // Cleanup
        $this->conn->query("DELETE FROM scm_items WHERE scm_id = {$scmId}");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-CHILLER-3'");
    }



    private function fetch(string $ciclo, int $equipamentoId): ?array
    {
        $stmt = $this->conn->prepare(
            'SELECT observacao, scm_number FROM preventive_cycle_items WHERE ciclo = ? AND equipamento_id = ?'
        );
        $stmt->bind_param('si', $ciclo, $equipamentoId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row;
    }
}
