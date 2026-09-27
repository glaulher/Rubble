<?php

namespace Tests\Unit;

use App\Api\Repositories\PreventiveCycleRepository;
use App\Api\Repositories\ScmRepository;
use App\Config\Database;
use mysqli;
use PHPUnit\Framework\TestCase;

class ScmItemStatusTest extends TestCase
{
    private mysqli $conn;

    protected function setUp(): void
    {
        $this->conn = Database::connect();

        // Ensure migration 059 is applied
        $check = $this->conn->query("SHOW COLUMNS FROM scm_items LIKE 'status'");
        if ($check && $check->num_rows === 0) {
            $this->conn->query("ALTER TABLE scm_items ADD COLUMN status VARCHAR(50) DEFAULT NULL AFTER subtotal_execucao");
        }

        // Ensure migration 060 is applied (status dropped from scm)
        $checkScm = $this->conn->query("SHOW COLUMNS FROM scm LIKE 'status'");
        if ($checkScm && $checkScm->num_rows > 0) {
            $this->conn->query("ALTER TABLE scm DROP COLUMN status");
        }
    }

    public function testScmTableDoesNotHaveStatusColumn(): void
    {
        $check = $this->conn->query("SHOW COLUMNS FROM scm LIKE 'status'");
        $this->assertNotNull($check);
        $this->assertSame(0, $check->num_rows, 'Parent scm table must not have status column');
    }

    public function testScmItemsHasStatusColumn(): void
    {
        $check = $this->conn->query("SHOW COLUMNS FROM scm_items LIKE 'status'");
        $this->assertNotNull($check);
        $this->assertSame(1, $check->num_rows, 'Daughter scm_items table must have status column');
    }

    public function testUpsertItemsPersistsItemLevelStatus(): void
    {
        $repo = new ScmRepository();

        $this->conn->query("DELETE FROM scm_items WHERE scm_id IN (SELECT id FROM scm WHERE scm = 'SCM-TEST-ITEM-STATUS')");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-TEST-ITEM-STATUS'");

        $stmt = $this->conn->prepare("INSERT INTO scm (scm, site, segmento) VALUES (?, ?, ?)");
        $scm = 'SCM-TEST-ITEM-STATUS';
        $site = 'RJOMNB';
        $seg = 'PREVENTIVA';
        $stmt->bind_param('sss', $scm, $site, $seg);
        $stmt->execute();
        $scmId = $this->conn->insert_id;
        $stmt->close();

        $items = [
            [
                'servico' => '26 - SELF SPLIT-RJOMNB-TOSI-SCTPAD 035 2FA1-EPX-SALA IDE EQUIPAMENTOS',
                'unidade' => 'TR',
                'valor' => 1410.0,
                'qtde_execucao' => 4.0,
                'subtotal_execucao' => 5640.0,
                'status' => 'SCM negado',
            ],
            [
                'servico' => '27 - SELF -RJOMNB-TRANE -TRAE100S01001338 -SUBESTAÇÃO',
                'unidade' => 'TR',
                'valor' => 940.0,
                'qtde_execucao' => 2.0,
                'subtotal_execucao' => 1880.0,
                'status' => 'SCM aprovado',
            ],
        ];

        $res = $repo->upsertItems($scmId, $items);
        $this->assertTrue($res);

        $savedItems = $repo->getItems($scmId);
        $this->assertCount(2, $savedItems);
        $this->assertSame('SCM negado', $savedItems[0]['status']);
        $this->assertSame('SCM aprovado', $savedItems[1]['status']);

        // Check ScmRepository listAll and getById resolve status from daughter items
        $scmData = $repo->getById($scmId);
        $this->assertNotNull($scmData);
        $this->assertSame('SCM aprovado', $scmData['status'], 'Parent status is resolved by priority from daughter items');

        // Check getTotalValue with status filter
        $totalNegado = $repo->getTotalValue('', null, null, [], 'SCM negado');
        $this->assertGreaterThanOrEqual(5640.0, $totalNegado);

        // Cleanup
        $this->conn->query("DELETE FROM scm_items WHERE scm_id = {$scmId}");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-TEST-ITEM-STATUS'");
    }

    public function testPreventiveCycleRepoResolvesItemLevelStatus(): void
    {
        $cycleRepo = new PreventiveCycleRepository();
        $ciclo = '2099-09';

        // Prepare test SCM and items
        $this->conn->query("DELETE FROM preventive_cycle_items WHERE ciclo = '{$ciclo}'");
        $this->conn->query("DELETE FROM scm_items WHERE scm_id IN (SELECT id FROM scm WHERE scm = 'SCM-TEST-MULTI-STATUS')");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-TEST-MULTI-STATUS'");

        $stmt = $this->conn->prepare("INSERT INTO scm (scm, site, segmento) VALUES (?, ?, ?)");
        $scm = 'SCM-TEST-MULTI-STATUS';
        $site = 'RJOMNB';
        $seg = 'PREVENTIVA ON GOING';
        $stmt->bind_param('sss', $scm, $site, $seg);
        $stmt->execute();
        $scmId = $this->conn->insert_id;
        $stmt->close();

        // Item 1: NEGADO for SELF SPLIT in SALA IDE EQUIPAMENTOS
        // Item 2: APROVADO for SELF in SUBESTAÇÃO
        $stmtItem = $this->conn->prepare("INSERT INTO scm_items (scm_id, servico, status, subtotal_execucao) VALUES (?, ?, ?, ?)");
        $serv1 = '26 - SELF SPLIT-RJOMNB-TOSI-SCTPAD 035 2FA1-EPX-SALA IDE EQUIPAMENTOS';
        $stat1 = 'SCM negado';
        $sub1 = 5640.0;
        $stmtItem->bind_param('issd', $scmId, $serv1, $stat1, $sub1);
        $stmtItem->execute();

        $serv2 = '27 - SELF -RJOMNB-TRANE -TRAE100S01001338 -SUBESTAÇÃO';
        $stat2 = 'SCM aprovado';
        $sub2 = 1880.0;
        $stmtItem->bind_param('issd', $scmId, $serv2, $stat2, $sub2);
        $stmtItem->execute();
        $stmtItem->close();

        // Launch equipment 47 (SELF SPLIT 01) and 51 (SELF 01)
        $cycleRepo->saveBatch($ciclo, [
            ['equipamento_id' => 47, 'checked' => true, 'observacao' => '', 'scm_number' => $scm],
            ['equipamento_id' => 51, 'checked' => true, 'observacao' => '', 'scm_number' => $scm],
        ]);

        // 1. Check listByCiclo
        $list = $cycleRepo->listByCiclo($ciclo, 50, 0, 'RJOMNB', true);
        $statusByEquip = [];
        foreach ($list as $row) {
            $statusByEquip[$row['equipamento_id']] = $row['scm_status'];
        }
        $this->assertSame('SCM negado', $statusByEquip[47] ?? null, 'SELF SPLIT must resolve to SCM negado');
        $this->assertSame('SCM aprovado', $statusByEquip[51] ?? null, 'SELF must resolve to SCM aprovado');

        // 2. Check findScmWithEquipment
        $scmEq47 = $cycleRepo->findScmWithEquipment($scm, 47);
        $this->assertNotNull($scmEq47);
        $this->assertSame('SCM negado', $scmEq47['status']);

        $scmEq51 = $cycleRepo->findScmWithEquipment($scm, 51);
        $this->assertNotNull($scmEq51);
        $this->assertSame('SCM aprovado', $scmEq51['status']);

        // 3. Check summary when filtering by SCM negado
        $summaryNegado = $cycleRepo->summary($ciclo, false, false, false, '', '', '', ['SCM negado']);
        $this->assertSame(1, $summaryNegado['checked_count'], 'Only equip 47 should match SCM negado');

        // 4. Check summary when filtering by SCM aprovado
        $summaryAprovado = $cycleRepo->summary($ciclo, false, false, false, '', '', '', ['SCM aprovado']);
        $this->assertSame(1, $summaryAprovado['checked_count'], 'Only equip 51 should match SCM aprovado');

        // Cleanup
        $this->conn->query("DELETE FROM preventive_cycle_items WHERE ciclo = '{$ciclo}'");
        $this->conn->query("DELETE FROM scm_items WHERE scm_id = {$scmId}");
        $this->conn->query("DELETE FROM scm WHERE scm = 'SCM-TEST-MULTI-STATUS'");
    }
}
