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
