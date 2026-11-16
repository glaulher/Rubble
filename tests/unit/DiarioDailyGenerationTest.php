<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Repositories\DiarioRepository;
use App\Api\Repositories\TeamRepository;
use App\Api\Services\DiarioService;
use PHPUnit\Framework\TestCase;

class DiarioDailyGenerationTest extends TestCase
{
    public function testGenerateDailyEntriesCreatesRowsForActiveTechnicians(): void
    {
        $mockTeamRepo = $this->createMock(TeamRepository::class);
        $mockTeamRepo->expects($this->once())
            ->method('getActiveTeamsWithTechnicians')
            ->willReturn([
                [
                    'id' => 1,
                    'nome' => 'Alexandre - Flavio',
                    'tecnico' => 'ALEXANDRE DONATO DA SILVA',
                    'placa' => 'TBO-9J41',
                ],
                [
                    'id' => 2,
                    'nome' => 'Lucas Tadeu - Jackson',
                    'tecnico' => 'LUCAS TADEU DOS SANTOS SOARES',
                    'placa' => 'KOY-5F34',
                ],
            ]);

        $mockDiarioRepo = $this->createMock(DiarioRepository::class);
        $mockDiarioRepo->expects($this->exactly(2))
            ->method('hasEntryForTechnicianOrTeamOnDate')
            ->willReturn(false);

        $mockDiarioRepo->expects($this->exactly(2))
            ->method('create')
            ->willReturnCallback(function (array $record, ?int $userId) {
                $this->assertNull($userId);
                $this->assertSame('2026-11-16', $record['data']);
                $this->assertNotEmpty($record['tecnico']);
                $this->assertNotEmpty($record['equipe']);
                return rand(100, 999);
            });

        $service = new DiarioService($mockDiarioRepo, $mockTeamRepo);
        $result = $service->generateDailyEntriesForTechnicians('2026-11-16');

        $this->assertSame('2026-11-16', $result['date']);
        $this->assertSame(2, $result['total_teams']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(0, $result['skipped']);
        $this->assertCount(2, $result['created_ids']);
    }

    public function testGenerateDailyEntriesSkipsExistingTechnicians(): void
    {
        $mockTeamRepo = $this->createMock(TeamRepository::class);
        $mockTeamRepo->method('getActiveTeamsWithTechnicians')
            ->willReturn([
                [
                    'id' => 1,
                    'nome' => 'Alexandre - Flavio',
                    'tecnico' => 'ALEXANDRE DONATO DA SILVA',
                    'placa' => 'TBO-9J41',
                ],
                [
                    'id' => 2,
                    'nome' => 'Lucas Tadeu - Jackson',
                    'tecnico' => 'LUCAS TADEU DOS SANTOS SOARES',
                    'placa' => 'KOY-5F34',
                ],
            ]);

        $mockDiarioRepo = $this->createMock(DiarioRepository::class);
        // First technician already has entry, second does not
        $mockDiarioRepo->method('hasEntryForTechnicianOrTeamOnDate')
            ->willReturnCallback(function (string $date, string $tecnico, ?string $equipe) {
                if ($tecnico === 'ALEXANDRE DONATO DA SILVA') {
                    return true;
                }
                return false;
            });

        // Only one should be created
        $mockDiarioRepo->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $record) {
                return $record['tecnico'] === 'LUCAS TADEU DOS SANTOS SOARES';
            }), null)
            ->willReturn(555);

        $service = new DiarioService($mockDiarioRepo, $mockTeamRepo);
        $result = $service->generateDailyEntriesForTechnicians('2026-11-16');

        $this->assertSame(2, $result['total_teams']);
        $this->assertSame(1, $result['created']);
        $this->assertSame(1, $result['skipped']);
        $this->assertEquals([555], $result['created_ids']);
    }

    public function testGenerateDailyEntriesThrowsOnInvalidDateFormat(): void
    {
        $service = new DiarioService();
        $this->expectException(\InvalidArgumentException::class);
        $service->generateDailyEntriesForTechnicians('16/11/2026');
    }
}
