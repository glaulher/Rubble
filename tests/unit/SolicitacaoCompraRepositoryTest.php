<?php

namespace Tests\Unit;

use App\Api\Repositories\SolicitacaoCompraRepository;
use App\Config\Database;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraRepositoryTest extends TestCase
{
    private SolicitacaoCompraRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();

        $conn = Database::connect();
        $check = $conn->query("SHOW TABLES LIKE 'solicitacao_compra'");
        if ($check === false || $check->num_rows === 0) {
            $this->markTestSkipped('migration 070 não aplicada');
        }

        $this->repo = new SolicitacaoCompraRepository();
        $this->repo->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->repo->rollback();
        parent::tearDown();
    }

    private function baseRow(array $over = []): array
    {
        return array_merge([
            'titulo_email' => 'Cotação de teste',
            'status' => 'em_cotacao',
            'site' => 'BMADTC',
            'data' => '2026-10-01',
            'data_status' => '2026-10-01',
        ], $over);
    }

    public function testSaveThenGetById(): void
    {
        $id = $this->repo->save($this->baseRow(['titulo_email' => 'ZZSC Filtros 20x20']));

        $row = $this->repo->getById($id);

        $this->assertSame('ZZSC Filtros 20x20', $row['titulo_email']);
        $this->assertSame('em_cotacao', $row['status']);
    }

    public function testListAllFiltersByStatusAndSite(): void
    {
        $siteA = 'ZZSC-A';
        $siteB = 'ZZSC-B';

        $this->repo->save($this->baseRow(['status' => 'sc_aprovada', 'site' => $siteA]));
        $this->repo->save($this->baseRow(['status' => 'em_cotacao', 'site' => $siteB]));

        $byStatus = $this->repo->listAll(20, 0, '', 'sc_aprovada', $siteA);
        $this->assertCount(1, $byStatus);
        $this->assertSame($siteA, $byStatus[0]['site']);

        $bySite = $this->repo->listAll(20, 0, '', null, $siteB);
        $this->assertCount(1, $bySite);
        $this->assertSame('em_cotacao', $bySite[0]['status']);

        $this->assertSame(1, $this->repo->count('', 'sc_aprovada', $siteA));
        $this->assertSame(2, $this->repo->count('', null, 'ZZSC'));
    }

    public function testListAllAcceptsCommaSeparatedSites(): void
    {
        $this->repo->save($this->baseRow(['site' => 'ZZSC-M1']));
        $this->repo->save($this->baseRow(['site' => 'ZZSC-M2']));
        $this->repo->save($this->baseRow(['site' => 'ZZSC-M3']));

        $rows = $this->repo->listAll(20, 0, '', null, 'ZZSC-M1,ZZSC-M3');

        $sites = array_column($rows, 'site');
        sort($sites);

        $this->assertSame(['ZZSC-M1', 'ZZSC-M3'], $sites);
        $this->assertSame(2, $this->repo->count('', null, 'ZZSC-M1,ZZSC-M3'));
    }

    public function testSearchMatchesTitleSiteAndNumbers(): void
    {
        $this->repo->save($this->baseRow([
            'titulo_email' => 'ZZSC Cotação bomba',
            'numero_sc' => 'ZZSC-9001',
        ]));

        $this->assertCount(1, $this->repo->listAll(20, 0, 'ZZSC Cotação bomba', null, null));
        $this->assertCount(1, $this->repo->listAll(20, 0, 'ZZSC-9001', null, null));
    }

    public function testExistsByScNumberDetectsDuplicates(): void
    {
        $this->assertFalse($this->repo->existsByScNumber('ZZSC-777'));

        $id = $this->repo->save($this->baseRow(['numero_sc' => 'ZZSC-777']));

        $this->assertTrue($this->repo->existsByScNumber('ZZSC-777'));
        $this->assertFalse($this->repo->existsByScNumber('ZZSC-777', $id));
    }

    public function testListAllJoinsPvTotalAndReturnsNullWhenMissing(): void
    {
        $id = $this->repo->save($this->baseRow(['numero_pv' => 'ZZSCNOPV']));

        $row = $this->repo->getById($id);

        $this->assertNull($row['pv_valor_total']);
    }

    public function testMarkSlaNotifiedRecordsDataStatus(): void
    {
        $id = $this->repo->save($this->baseRow(['sla_dias' => 3, 'data_status' => '2026-10-20']));

        $this->repo->markSlaNotified($id, '2026-10-20');

        $row = $this->repo->getById($id);
        $this->assertNotNull($row['sla_notificado_em']);
        $this->assertSame('2026-10-20', $row['sla_notificado_data_status']);
    }

    public function testStatusCountsGroupsByStatus(): void
    {
        $this->repo->save($this->baseRow(['status' => 'pc_gerado', 'site' => 'ZZSC-C']));

        $counts = $this->repo->statusCounts();

        $this->assertSame(1, $counts['pc_gerado']);
    }

    public function testUpdateAndDelete(): void
    {
        $id = $this->repo->save($this->baseRow(['titulo_email' => 'ZZSC Antes']));

        $this->assertTrue($this->repo->update($id, $this->baseRow(['titulo_email' => 'ZZSC Depois'])));
        $this->assertSame('ZZSC Depois', $this->repo->getById($id)['titulo_email']);

        $this->assertTrue($this->repo->delete($id));
        $this->assertNull($this->repo->getById($id));
    }

    public function testListWithSlaReturnsOnlyRowsWithSla(): void
    {
        $this->repo->save($this->baseRow(['site' => 'ZZSC-D', 'sla_dias' => 5]));

        $rows = $this->repo->listWithSla();
        $sites = array_column($rows, 'site');

        $this->assertContains('ZZSC-D', $sites);
        foreach ($rows as $row) {
            $this->assertNotNull($row['sla_dias']);
        }
    }
}
