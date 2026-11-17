<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Repositories\PontoRepository;
use PHPUnit\Framework\TestCase;

class PontoRepositoryTest extends TestCase
{
    private PontoRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new PontoRepository();
    }

    public function testColaboradorLifecycleAndQueries(): void
    {
        $matricula = 'TEST_' . uniqid();
        $colabData = [
            'matricula' => $matricula,
            'nome' => 'Colaborador Teste Automatizado',
            'cc' => '9999',
            'funcao' => 'Técnico Teste',
            'turno' => 'Comercial',
        ];

        // 1. Inserção
        $id = $this->repo->upsertColaborador($colabData);
        $this->assertGreaterThan(0, $id);

        // 2. Busca por matrícula
        $found = $this->repo->findColaboradorByMatricula($matricula);
        $this->assertNotNull($found);
        $this->assertSame('Colaborador Teste Automatizado', $found['nome']);
        $this->assertSame('9999', $found['cc']);

        // 3. Atualização idempotente
        $colabData['funcao'] = 'Técnico Sênior';
        $updatedId = $this->repo->upsertColaborador($colabData);
        $this->assertSame($id, $updatedId);

        $foundUpdated = $this->repo->findColaboradorByMatricula($matricula);
        $this->assertSame('Técnico Sênior', $foundUpdated['funcao']);

        // 4. Inserção de registro de ponto diário
        $regId = $this->repo->upsertRegistro([
            'colaborador_id' => $id,
            'data' => '2026-11-14',
            'dia_semana' => 'Sex',
            'e1' => '08:00',
            's1' => '12:00',
            'e2' => '13:00',
            's2' => '19:30',
            'he' => '02:30',
            'he_min' => 150,
            'absent' => null,
            'absent_min' => 0,
            'status' => 'OK',
        ]);
        $this->assertGreaterThan(0, $regId);

        // 5. Inserção de banco de horas
        $this->repo->upsertBancoHoras([
            'colaborador_id' => $id,
            'ciclo_inicio' => '2026-11-01',
            'ciclo_fim' => '2026-11-30',
            'saldo_anterior' => '00:00',
            'debito' => '00:00',
            'credito' => '02:30',
            'saldo_atual' => '+02:30',
            'saldo_atual_min' => 150,
            'dias_com_he' => 1,
            'dias_com_ausencia' => 0,
            'nome_gestor' => 'Gestor Alpha',
            'adm_responsavel' => 'Adm Beta',
            'observacao' => 'Teste de observação',
        ]);

        // 6. Anotação de Hora Extra
        $this->repo->upsertAnotacaoHe(
            $id,
            '2026-11-14',
            'Gestor Alpha',
            'Adm Beta',
            'Sim',
            'Atendimento emergencial no Chiller',
            'tester'
        );

        // 7. Listagem de Banco de Horas
        $listBh = $this->repo->listBancoHoras('9999');
        $this->assertNotEmpty($listBh);
        $colabBh = null;
        foreach ($listBh as $item) {
            if ($item['colaborador_id'] == $id) {
                $colabBh = $item;
                break;
            }
        }
        $this->assertNotNull($colabBh);
        $this->assertSame('+02:30', $colabBh['saldo_atual']);
        $this->assertSame('Gestor Alpha', $colabBh['nome_gestor']);

        // 8. Listagem de Horas Extras Simplificadas
        $listHe = $this->repo->listHorasExtrasSimplificadas('2026-11-01', '2026-11-30', '9999');
        $this->assertNotEmpty($listHe);
        $itemHe = null;
        foreach ($listHe as $item) {
            if ($item['colaborador_id'] == $id) {
                $itemHe = $item;
                break;
            }
        }
        $this->assertNotNull($itemHe);
        $this->assertSame('02:30', $itemHe['he']);
        $this->assertSame('Sim', $itemHe['sobreaviso']);
        $this->assertSame('Atendimento emergencial no Chiller', $itemHe['justificativa']);

        // 9. Extrato do Colaborador
        $extrato = $this->repo->getExtratoColaborador($id);
        $this->assertCount(1, $extrato);
        $this->assertSame('2026-11-14', $extrato[0]['data']);

        // 10. Limpeza do colaborador de teste
        $cleanStmt = DatabaseTestHelper::getConn()->prepare('DELETE FROM ponto_colaboradores WHERE id = ?');
        $cleanStmt->bind_param('i', $id);
        $cleanStmt->execute();
        $cleanStmt->close();
    }
}

class DatabaseTestHelper
{
    public static function getConn(): \mysqli
    {
        return \App\Config\Database::connect();
    }
}
