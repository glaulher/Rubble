<?php

namespace Tests\Unit;

use App\Config\Database;
use mysqli;
use PHPUnit\Framework\TestCase;

class SchemaRefinementsTest extends TestCase
{
    private mysqli $conn;

    protected function setUp(): void
    {
        $this->conn = Database::connect();
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $stmt = $this->conn->prepare("SHOW INDEX FROM `{$table}` WHERE Key_name = ?");
        $stmt->bind_param('s', $indexName);
        $stmt->execute();
        return $stmt->get_result()->num_rows > 0;
    }

    private function columnType(string $table, string $column): string
    {
        $stmt = $this->conn->prepare("SHOW COLUMNS FROM `{$table}` WHERE Field = ?");
        $stmt->bind_param('s', $column);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return $row['Type'] ?? '';
    }

    private function tableCollation(string $table): string
    {
        $stmt = $this->conn->prepare("SHOW TABLE STATUS WHERE Name = ?");
        $stmt->bind_param('s', $table);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return $row['Collation'] ?? '';
    }

    private function fkExists(string $table, string $fkName): bool
    {
        $sql = "
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND CONSTRAINT_NAME = ?
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ss', $table, $fkName);
        $stmt->execute();
        return $stmt->get_result()->num_rows > 0;
    }

    public function testRateLimitsHasNoDuplicateIndex(): void
    {
        $exists = $this->indexExists('rate_limits', 'idx_rate_limits_lookup');
        $this->assertFalse($exists, 'idx_rate_limits_lookup should be removed (uk_rate_limit already covers it)');
    }

    public function testPlanejamentoDatasCollationIsUtf8mb4(): void
    {
        $collation = $this->tableCollation('planejamento_datas');
        $this->assertStringContainsString('utf8mb4_unicode_ci', $collation);
    }

    public function testPvItemDescricaoIsText(): void
    {
        $type = $this->columnType('pv_item', 'descricao');
        $this->assertStringContainsString('text', strtolower($type));
    }

    public function testPvItemDescricaoLpuIsText(): void
    {
        $type = $this->columnType('pv_item', 'descricao_lpu');
        $this->assertStringContainsString('text', strtolower($type));
    }

    public function testAtividadesPreventivasHasSiteIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('atividades_preventivas', 'idx_ap_site')
        );
    }

    public function testAtividadesPreventivasHasStatusIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('atividades_preventivas', 'idx_ap_status')
        );
    }

    public function testAtividadesPreventivasHasDataPlanejadaIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('atividades_preventivas', 'idx_ap_data_planejada')
        );
    }

    public function testScmItemsHasServicoFulltextIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('scm_items', 'ft_scm_items_servico')
        );
    }

    public function testPlanejamentoDatasHasSortOrderIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('planejamento_datas', 'idx_pd_sort_order')
        );
    }

    public function testUserActivityHasForeignKeyToUsuarios(): void
    {
        $this->assertTrue(
            $this->fkExists('user_activity', 'fk_user_activity_user')
        );
    }

    public function testLoginAttemptsHasAttemptedAtIndex(): void
    {
        $this->assertTrue(
            $this->indexExists('login_attempts', 'idx_login_attempts_attempted_at')
        );
    }
}
