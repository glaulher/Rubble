<?php

namespace Tests\Unit;

use App\Api\Services\PreventivaService;
use PHPUnit\Framework\TestCase;

class PreventivaServiceTest extends TestCase
{
    public function testClassExists(): void
    {
        $this->assertTrue(class_exists(PreventivaService::class));
    }

    public function testUpdateStatusWithoutDateDoesNotPassDataPlanejada(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Cancelado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything());

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', 'reagendado', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testUpdateStatusWithDatePassesDataPlanejadaToRepository(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Planejado',
            'obs' => '',
        ]);
        $mockRepo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'Planejado', $this->anything(), '2026-08-15');

        $service = new PreventivaService($mockRepo);
        $service->updateStatus(1, 'Planejado', '', ['nome' => 'Test', 'role' => 'admin'], '2026-08-15');
    }

    public function testUpdateStatusThrowsOnInvalidTransition(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 1,
            'status' => 'Concluído',
            'obs' => '',
        ]);

        $service = new PreventivaService($mockRepo);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Transição inválida');
        $service->updateStatus(1, 'Cancelado', '', ['nome' => 'Test', 'role' => 'admin']);
    }

    public function testDeleteMethodExists(): void
    {
        $this->assertTrue(method_exists(PreventivaService::class, 'delete'));
    }

    public function testEnrichItemCalculatesSlaProgressWithGroupId(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 10,
            'site' => 'RJOPIA',
            'status' => 'Planejado',
            'obs' => '',
            'sla_days' => 3,
            'sla_group_id' => 10,
        ]);
        $mockRepo->method('countMachinesForSite')->with('RJOPIA')->willReturn(8);
        $mockRepo->method('sumQtdForGroup')->with(10)->willReturn(3);
        $mockRepo->method('getPreventivaItemById')->with(10)->willReturn([
            'id' => 10,
            'local' => 'RJOPIA',
            'status' => 'Em Andamento',
            'qtd_executada' => 1,
            'sla_days' => 3,
            'sla_group_id' => 10,
            'machine_count' => 8,
        ]);

        $service = new PreventivaService($mockRepo);
        $result = $service->updateStatus(10, 'Em Andamento', 'iniciando', ['nome' => 'Admin', 'role' => 'admin'], null, 1);

        $this->assertSame(3, $result['item']['sla_feito']);
        $this->assertSame(5, $result['item']['sla_restam']);
        $this->assertSame(38, $result['item']['sla_pct']);
    }

    public function testUpdateStatusEnforcesSlaGroupTotalAgainstSiteMachines(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);
        $mockRepo->method('getById')->willReturn([
            'id' => 11,
            'site' => 'RJOPIA',
            'status' => 'Planejado',
            'obs' => '',
            'sla_days' => 3,
            'sla_group_id' => 10,
        ]);
        $mockRepo->method('countMachinesForSite')->with('RJOPIA')->willReturn(8);
        // Outros cards já somam 7 máquinas
        $mockRepo->method('sumQtdForGroup')->with(10, 11)->willReturn(7);

        $service = new PreventivaService($mockRepo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Total do SLA (9) excede 8 máquinas do site. Restam 1.');

        $service->updateStatus(11, 'Em Andamento', '', ['nome' => 'Admin', 'role' => 'admin'], null, 2);
    }

    public function testImportBatchGroupsMultiDaySiteAndDelegatesToRepository(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);

        $mockRepo->expects($this->once())
            ->method('importBatch')
            ->with($this->callback(function (array $groups) {
                // Must have grouped NRIDTC with 2 dates and BMADTC with 1 date
                $nri = array_values(array_filter($groups, fn ($g) => $g['site'] === 'NRIDTC'));
                $bma = array_values(array_filter($groups, fn ($g) => $g['site'] === 'BMADTC'));

                if (count($nri) !== 1 || count($bma) !== 1) {
                    return false;
                }

                // NRIDTC dates must be sorted
                if ($nri[0]['dates'] !== ['2026-11-03', '2026-11-04']) {
                    return false;
                }

                if ($bma[0]['dates'] !== ['2026-11-19']) {
                    return false;
                }

                return true;
            }))
            ->willReturn([
                'imported' => 3,
                'skipped' => 0,
                'errors' => [],
            ]);

        $service = new PreventivaService($mockRepo);
        $rows = [
            ['data' => '2026-11-04', 'site' => 'NRIDTC', 'tipo' => 'preventiva'],
            ['data' => '2026-11-03', 'site' => 'NRIDTC', 'tipo' => 'preventiva'],
            ['data' => '2026-11-19', 'site' => 'BMADTC', 'tipo' => 'preventiva'],
        ];

        $result = $service->importBatch($rows, ['nome' => 'Admin', 'role' => 'admin']);
        $this->assertSame(3, $result['imported']);
        $this->assertSame(0, $result['skipped']);
    }

    public function testImportBatchNormalizesBrazilianDatesAndTipo(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);

        $mockRepo->expects($this->once())
            ->method('importBatch')
            ->with($this->callback(function (array $groups) {
                $item = $groups[0] ?? null;
                return $item && $item['site'] === 'RJOFRG'
                    && $item['dates'] === ['2026-11-03']
                    && $item['tipo'] === 'preventiva';
            }))
            ->willReturn(['imported' => 1, 'skipped' => 0, 'errors' => []]);

        $service = new PreventivaService($mockRepo);
        $rows = [
            ['data' => '03/11/2026', 'site' => ' RJOFRG ', 'tipo' => 'PREVENTIVA'],
        ];

        $result = $service->importBatch($rows, ['nome' => 'Admin', 'role' => 'admin']);
        $this->assertSame(1, $result['imported']);
    }

    public function testImportBatchSkipsRowsWithInvalidDateOrEmptySite(): void
    {
        $mockRepo = $this->createMock(\App\Api\Repositories\PreventivaRepository::class);

        $mockRepo->expects($this->once())
            ->method('importBatch')
            ->with($this->callback(function (array $groups) {
                return count($groups) === 1 && $groups[0]['site'] === 'VALID';
            }))
            ->willReturn(['imported' => 1, 'skipped' => 0, 'errors' => []]);

        $service = new PreventivaService($mockRepo);
        $rows = [
            ['data' => '2026-11-03', 'site' => '', 'tipo' => 'preventiva'],
            ['data' => 'data-invalida', 'site' => 'SITE1', 'tipo' => 'preventiva'],
            ['data' => '2026-11-05', 'site' => 'VALID', 'tipo' => 'preventiva'],
        ];

        $result = $service->importBatch($rows, ['nome' => 'Admin', 'role' => 'admin']);
        $this->assertSame(1, $result['imported']);
        $this->assertSame(2, $result['skipped']);
    }
}
