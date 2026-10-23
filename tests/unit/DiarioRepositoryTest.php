<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Repositories\DiarioRepository;
use App\Api\Entities\DiarioAtividade;

class DiarioRepositoryTest extends TestCase
{
    private DiarioRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new DiarioRepository();
        $this->repo->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->repo->rollback();
        parent::tearDown();
    }

    public function testCreateAndFindById(): void
    {
        $data = [
            'site' => 'TEST_SITE_A',
            'equipamento_id' => null,
            'localidade' => 'Sala 1',
            'os' => 'OS99999',
            'data' => '2026-10-22',
            'categoria' => 'corretiva',
            'status' => 'Pendente',
            'obs' => 'Primeira observação',
        ];

        $id = $this->repo->create($data, 1);
        $this->assertGreaterThan(0, $id);

        $item = $this->repo->findById($id);
        $this->assertNotNull($item);
        $this->assertInstanceOf(DiarioAtividade::class, $item);
        $this->assertSame($id, $item->id);
        $this->assertSame('TEST_SITE_A', $item->site);
        $this->assertSame('Sala 1', $item->localidade);
        $this->assertSame('OS99999', $item->os);
        $this->assertSame('2026-10-22', $item->data);
        $this->assertSame('corretiva', $item->categoria);
        $this->assertSame('Pendente', $item->status);
        $this->assertSame('Primeira observação', $item->obs);
        $this->assertSame(1, $item->createdBy);
    }

    public function testListAndCountWithFilters(): void
    {
        $id1 = $this->repo->create([
            'site' => 'FILT_SITE_X',
            'localidade' => 'Loc X',
            'os' => 'OS111',
            'data' => '2026-10-20',
            'categoria' => 'corretiva',
            'status' => 'Pendente',
            'obs' => 'Vazamento de água',
        ], 1);

        $id2 = $this->repo->create([
            'site' => 'FILT_SITE_Y',
            'localidade' => 'Loc Y',
            'os' => 'OS222',
            'data' => '2026-10-22',
            'categoria' => 'preventiva',
            'status' => 'Concluído',
            'obs' => 'Limpeza de filtro',
        ], 1);

        // Filter by search
        $resSearch = $this->repo->list(['search' => 'FILT_SITE_X']);
        $this->assertCount(1, $resSearch);
        $this->assertSame($id1, $resSearch[0]['id']);

        // Filter by status array
        $resStatus = $this->repo->list(['status' => ['Concluído']]);
        $hasId2 = false;
        foreach ($resStatus as $r) {
            if ($r['id'] === $id2) $hasId2 = true;
        }
        $this->assertTrue($hasId2);

        // Filter by categoria
        $resCat = $this->repo->list(['categoria' => ['preventiva']]);
        $hasId2Cat = false;
        foreach ($resCat as $r) {
            if ($r['id'] === $id2) $hasId2Cat = true;
        }
        $this->assertTrue($hasId2Cat);

        // Filter by date range
        $resDate = $this->repo->list(['data_from' => '2026-10-21', 'data_to' => '2026-10-23']);
        $hasId2Date = false;
        $hasId1Date = false;
        foreach ($resDate as $r) {
            if ($r['id'] === $id2) $hasId2Date = true;
            if ($r['id'] === $id1) $hasId1Date = true;
        }
        $this->assertTrue($hasId2Date);
        $this->assertFalse($hasId1Date);

        // Count with filter
        $count = $this->repo->count(['search' => 'FILT_SITE_X']);
        $this->assertSame(1, $count);
    }

    public function testUpdateField(): void
    {
        $id = $this->repo->create([
            'site' => 'SITE_UPD',
            'status' => 'Pendente',
            'categoria' => 'corretiva',
        ], 1);

        // Update valid field
        $updated = $this->repo->updateField($id, 'status', 'Em andamento');
        $this->assertTrue($updated);

        $item = $this->repo->findById($id);
        $this->assertSame('Em andamento', $item->status);

        // Update equipe field
        $updatedEquipe = $this->repo->updateField($id, 'equipe', 'Técnico Silva');
        $this->assertTrue($updatedEquipe);
        $item = $this->repo->findById($id);
        $this->assertSame('Técnico Silva', $item->equipe);

        // Update with N/A resets to null
        $this->repo->updateField($id, 'os', 'N/A');
        $item = $this->repo->findById($id);
        $this->assertNull($item->os);

        // Update invalid field throws exception
        $this->expectException(\InvalidArgumentException::class);
        $this->repo->updateField($id, 'campo_invalido', '123');
    }

    public function testUpdateObs(): void
    {
        $id = $this->repo->create([
            'site' => 'SITE_OBS',
            'obs' => 'Linha 1',
        ], 1);

        $updated = $this->repo->updateObs($id, "Linha 1\n\n[22/10/2026 20:30] Admin (admin): Linha 2");
        $this->assertTrue($updated);

        $item = $this->repo->findById($id);
        $this->assertStringContainsString('Linha 2', $item->obs);
    }

    public function testDeleteOwnership(): void
    {
        // Get two existing user IDs or fallback to 1 and null
        $idUser1 = $this->repo->create(['site' => 'DEL_U1'], 1);
        $idUser2 = $this->repo->create(['site' => 'DEL_U2'], 14);

        // User 1 cannot delete User 14's line
        $delFail = $this->repo->delete($idUser2, 1, false);
        $this->assertFalse($delFail);
        $this->assertNotNull($this->repo->findById($idUser2));

        // User 1 can delete own line
        $delOwn = $this->repo->delete($idUser1, 1, false);
        $this->assertTrue($delOwn);
        $this->assertNull($this->repo->findById($idUser1));

        // Admin can delete any line
        $delAdmin = $this->repo->delete($idUser2, 999, true);
        $this->assertTrue($delAdmin);
        $this->assertNull($this->repo->findById($idUser2));
    }

    public function testLookupOsObsReturnsNullForEmptyOrNa(): void
    {
        $this->assertNull($this->repo->lookupOsObs(''));
        $this->assertNull($this->repo->lookupOsObs('N/A'));
        $this->assertNull($this->repo->lookupOsObs('OS_INEXISTENTE_999999'));
    }
}
