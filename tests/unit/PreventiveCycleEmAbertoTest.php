<?php

namespace Tests\Unit;

use App\Api\Repositories\PreventiveCycleRepository;
use App\Config\Database;
use mysqli;
use PHPUnit\Framework\TestCase;

/**
 * Regra de negócio: um item do ciclo está "SCM em aberto" quando está MARCADO
 * (existe linha em preventive_cycle_items) e o número de SCM não resolve para
 * status nenhum. Itens DESMARCADOS (sem linha no ciclo) nunca ganham badge.
 */
class PreventiveCycleEmAbertoTest extends TestCase
{
    private mysqli $conn;
    private PreventiveCycleRepository $repo;

    private const CICLO = '2099-04';
    private const EXCLUDED_EQUIPMENT = 'N/A';
    private const EXCLUDED_LOCATION = 'Fornecimento';
    private const SCM_STATUS_ORDER = [
        'SCM em aberto', 'SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado',
    ];

    // IDs altos para não colidir com equipamentos reais do banco de dev.
    private const EQ_NO_SCM_A = 99020;  // TEST-A, marcado sem SCM
    private const EQ_NO_SCM_B = 99021;  // TEST-B, marcado sem SCM
    private const EQ_UNCHECKED = 99022; // TEST-C, desmarcado (sem linha no ciclo)
    private const EQ_ORPHAN = 99023;    // TEST-D, marcado com SCM inexistente
    private const EQ_APROVADO = 99024;  // TEST-E, marcado com SCM resolvido

    private const EQUIP_IDS = [99020, 99021, 99022, 99023, 99024];

    protected function setUp(): void
    {
        $this->conn = Database::connect();
        $this->repo = new PreventiveCycleRepository();
        $this->cleanCycle();
        foreach (self::EQUIP_IDS as $i => $id) {
            $this->ensureEquipment($id, 'TEST-' . chr(65 + $i));
        }
    }

    protected function tearDown(): void
    {
        $this->cleanCycle();
        foreach (self::EQUIP_IDS as $id) {
            $this->conn->query("DELETE FROM equipamentos WHERE id = {$id}");
        }
        $this->conn->query(
            "DELETE FROM scm_items WHERE scm_id IN (SELECT id FROM scm WHERE scm LIKE 'SCM-TEST-EMAB%')"
        );
        $this->conn->query("DELETE FROM scm WHERE scm LIKE 'SCM-TEST-EMAB%'");
    }

    private function cleanCycle(): void
    {
        $this->conn->query(
            "DELETE FROM preventive_cycle_items WHERE ciclo = '" . self::CICLO . "'"
        );
    }

    private function ensureEquipment(int $id, string $local): void
    {
        $this->conn->query("DELETE FROM equipamentos WHERE id = {$id}");
        $stmt = $this->conn->prepare(
            'INSERT INTO equipamentos (id, local, equipamento) VALUES (?, ?, ?)'
        );
        $nome = 'Ar Teste ' . $id;
        $stmt->bind_param('iss', $id, $local, $nome);
        $stmt->execute();
        $stmt->close();
    }

    private function check(array $items): void
    {
        $this->repo->saveBatch(self::CICLO, $items);
    }

    public function testScmStatusCountCountsCheckedItemsWithoutScmNumber(): void
    {
        $this->check([
            ['equipamento_id' => self::EQ_NO_SCM_A, 'checked' => true, 'observacao' => '', 'scm_number' => null],
            ['equipamento_id' => self::EQ_NO_SCM_B, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $counts = $this->repo->scmStatusCount(
            self::CICLO,
            self::EXCLUDED_EQUIPMENT,
            self::EXCLUDED_LOCATION,
            self::SCM_STATUS_ORDER
        );

        $this->assertSame(
            ['SCM em aberto' => 2],
            $counts,
            'Itens marcados sem número de SCM devem contar como SCM em aberto'
        );
    }

    public function testScmStatusCountIgnoresUncheckedEquipment(): void
    {
        $this->check([
            ['equipamento_id' => self::EQ_NO_SCM_A, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $counts = $this->repo->scmStatusCount(
            self::CICLO,
            self::EXCLUDED_EQUIPMENT,
            self::EXCLUDED_LOCATION,
            self::SCM_STATUS_ORDER
        );

        $this->assertSame(
            ['SCM em aberto' => 1],
            $counts,
            'Equipamentos desmarcados (sem linha no ciclo) não entram no badge'
        );
    }

    public function testScmStatusCountKeepsOrphanScmAsEmAberto(): void
    {
        $this->check([
            ['equipamento_id' => self::EQ_ORPHAN, 'checked' => true, 'observacao' => '', 'scm_number' => 'SCM-TEST-EMAB-ORFAO'],
        ]);

        $counts = $this->repo->scmStatusCount(
            self::CICLO,
            self::EXCLUDED_EQUIPMENT,
            self::EXCLUDED_LOCATION,
            self::SCM_STATUS_ORDER
        );

        $this->assertSame(
            ['SCM em aberto' => 1],
            $counts,
            'SCM preenchido mas inexistente na tabela scm continua como em aberto'
        );
    }

    public function testListByCicloMarksOnlyCheckedItemsAsEmAberto(): void
    {
        $this->check([
            ['equipamento_id' => self::EQ_NO_SCM_A, 'checked' => true, 'observacao' => '', 'scm_number' => null],
            ['equipamento_id' => self::EQ_NO_SCM_B, 'checked' => true, 'observacao' => '', 'scm_number' => null],
            ['equipamento_id' => self::EQ_ORPHAN, 'checked' => true, 'observacao' => '', 'scm_number' => 'SCM-TEST-EMAB-ORFAO'],
        ]);

        $list = $this->repo->listByCiclo(
            self::CICLO, 50, 0, 'TEST-', false, false, false, false, '',
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION
        );

        $statusByEquip = [];
        $checkedByEquip = [];
        foreach ($list as $row) {
            $statusByEquip[(int) $row['equipamento_id']] = $row['scm_status'];
            $checkedByEquip[(int) $row['equipamento_id']] = (int) $row['checked'];
        }

        $this->assertSame('SCM em aberto', $statusByEquip[self::EQ_NO_SCM_A] ?? null, 'Marcado sem SCM');
        $this->assertSame('SCM em aberto', $statusByEquip[self::EQ_NO_SCM_B] ?? null, 'Marcado sem SCM');
        $this->assertSame('SCM em aberto', $statusByEquip[self::EQ_ORPHAN] ?? null, 'Marcado com SCM órfão');
        $this->assertSame('', $statusByEquip[self::EQ_UNCHECKED] ?? null, 'Desmarcado não ganha badge');
        $this->assertSame(1, $checkedByEquip[self::EQ_NO_SCM_A] ?? null);
        $this->assertSame(0, $checkedByEquip[self::EQ_UNCHECKED] ?? null);
    }

    public function testStatusFilterEmAbertoIncludesItemsWithoutScmNumber(): void
    {
        $this->check([
            ['equipamento_id' => self::EQ_NO_SCM_A, 'checked' => true, 'observacao' => '', 'scm_number' => null],
            ['equipamento_id' => self::EQ_NO_SCM_B, 'checked' => true, 'observacao' => '', 'scm_number' => null],
        ]);

        $total = $this->repo->count(
            self::CICLO, '', false, false, false, false,
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, ['SCM em aberto']
        );
        $this->assertSame(2, $total, 'Filtro "SCM em aberto" deve incluir itens sem número de SCM');

        $ids = $this->repo->listIdsByCiclo(
            self::CICLO, '', false, false, false,
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, ['SCM em aberto']
        );
        $this->assertSame(
            [self::EQ_NO_SCM_A, self::EQ_NO_SCM_B],
            $ids,
            'Só os marcados devem voltar (TEST-A, TEST-B)'
        );

        $summary = $this->repo->summary(
            self::CICLO, false, false, false, '',
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, ['SCM em aberto']
        );
        $this->assertSame(2, $summary['checked_count']);
        $this->assertSame(2, $summary['site_count']);
    }

    public function testStatusFilterOtherThanEmAbertoStillExcludesItemsWithoutScmNumber(): void
    {
        $this->seedAprovadoScm();
        $this->check([
            ['equipamento_id' => self::EQ_NO_SCM_A, 'checked' => true, 'observacao' => '', 'scm_number' => null],
            ['equipamento_id' => self::EQ_APROVADO, 'checked' => true, 'observacao' => '', 'scm_number' => 'SCM-TEST-EMAB-APR'],
        ]);

        $aprovado = $this->repo->count(
            self::CICLO, '', false, false, false, false,
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, ['SCM aprovado']
        );
        $this->assertSame(1, $aprovado, 'Filtro por status resolvido não pode arrastar itens sem SCM');

        $emAberto = $this->repo->count(
            self::CICLO, '', false, false, false, false,
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION, ['SCM em aberto']
        );
        $this->assertSame(1, $emAberto, 'Só o item TEST-A (sem SCM) fica em aberto');

        $list = $this->repo->listByCiclo(
            self::CICLO, 50, 0, 'TEST-', false, false, false, false, '',
            self::EXCLUDED_EQUIPMENT, self::EXCLUDED_LOCATION
        );
        $statusByEquip = [];
        foreach ($list as $row) {
            $statusByEquip[(int) $row['equipamento_id']] = $row['scm_status'];
        }
        $this->assertSame('SCM em aberto', $statusByEquip[self::EQ_NO_SCM_A] ?? null);
        $this->assertSame('SCM aprovado', $statusByEquip[self::EQ_APROVADO] ?? null);

        $counts = $this->repo->scmStatusCount(
            self::CICLO,
            self::EXCLUDED_EQUIPMENT,
            self::EXCLUDED_LOCATION,
            self::SCM_STATUS_ORDER
        );
        $this->assertSame(
            ['SCM em aberto' => 1, 'SCM aprovado' => 1],
            $counts,
            'Badge do topo deve mostrar em aberto + aprovado com o site correto'
        );
    }

    private function seedAprovadoScm(): void
    {
        $conn = $this->conn;
        $conn->query("DELETE FROM scm_items WHERE scm_id IN (SELECT id FROM scm WHERE scm = 'SCM-TEST-EMAB-APR')");
        $conn->query("DELETE FROM scm WHERE scm = 'SCM-TEST-EMAB-APR'");

        $stmt = $conn->prepare("INSERT INTO scm (scm, site, segmento) VALUES (?, ?, ?)");
        $scm = 'SCM-TEST-EMAB-APR';
        $site = 'TEST-E';
        $seg = 'PREVENTIVA';
        $stmt->bind_param('sss', $scm, $site, $seg);
        $stmt->execute();
        $scmId = $conn->insert_id;
        $stmt->close();

        $stmtItem = $conn->prepare("INSERT INTO scm_items (scm_id, status) VALUES (?, ?)");
        $status = 'SCM aprovado';
        $stmtItem->bind_param('is', $scmId, $status);
        $stmtItem->execute();
        $stmtItem->close();
    }
}
