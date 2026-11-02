<?php

namespace Tests\Unit;

use App\Api\Repositories\EstoqueMaterialRepository;
use App\Api\Repositories\EstoqueSaidaRepository;
use App\Api\Services\EstoqueMaterialService;
use PHPUnit\Framework\TestCase;

class EstoqueMaterialServiceTest extends TestCase
{
    private EstoqueMaterialService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EstoqueMaterialService();
    }

    public function testValidateRejectsMissingRequiredFields(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Material é obrigatório.');

        $this->service->save([
            'site' => 'BMADTC',
            'data_entrada' => '2026-11-01',
        ]);
    }

    public function testSaveDefaultsSiteToEstoqueCentral(): void
    {
        $repoMock = $this->createMock(EstoqueMaterialRepository::class);
        $repoMock->expects($this->once())
            ->method('save')
            ->with($this->callback(function (array $data) {
                return $data['site'] === 'Estoque Central';
            }))
            ->willReturn(1);

        $service = new EstoqueMaterialService($repoMock);
        $id = $service->save([
            'material_descricao' => 'Filtro G4',
            'quantidade' => 5,
            'data_entrada' => '2026-11-01',
        ]);

        $this->assertSame(1, $id);
    }

    public function testUpdateRejectsEmptySite(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Site / Almoxarifado é obrigatório.');

        $this->service->update(1, [
            'site' => '   ',
        ]);
    }

    public function testValidateRejectsInvalidQuantity(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Quantidade deve ser maior que zero.');

        $this->service->save([
            'material_descricao' => 'Filtro G4',
            'site' => 'BMADTC',
            'data_entrada' => '2026-11-01',
            'quantidade' => -5,
        ]);
    }

    public function testUpdateRejectsQuantityLowerThanAlreadyExited(): void
    {
        $materialRepoMock = $this->createMock(EstoqueMaterialRepository::class);
        $saidaRepoMock = $this->createMock(EstoqueSaidaRepository::class);

        // Simulamos que já foram baixadas 3 unidades deste lote
        $saidaRepoMock->method('sumSaidasByMaterialId')->with(1)->willReturn(3.0);

        $service = new EstoqueMaterialService($materialRepoMock, $saidaRepoMock);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('A quantidade (2) não pode ser inferior ao total já baixado em saídas (3).');

        $service->update(1, [
            'quantidade' => 2.0,
        ]);
    }

    public function testSanitizeCsvInjection(): void
    {
        $safe1 = EstoqueMaterialService::sanitizeCsvFormula('=1+1');
        $this->assertSame("'=1+1", $safe1);

        $safe2 = EstoqueMaterialService::sanitizeCsvFormula('+cmd|');
        $this->assertSame("'+cmd|", $safe2);

        $safe3 = EstoqueMaterialService::sanitizeCsvFormula('-10');
        $this->assertSame("'-10", $safe3);

        $safe4 = EstoqueMaterialService::sanitizeCsvFormula('@calc');
        $this->assertSame("'@calc", $safe4);

        $normal = EstoqueMaterialService::sanitizeCsvFormula('Filtro normal 20x20');
        $this->assertSame('Filtro normal 20x20', $normal);
    }

    public function testExportCsvGeneratesBomAndDelimiter(): void
    {
        $repoMock = $this->createMock(EstoqueMaterialRepository::class);
        $repoMock->method('listAll')->willReturn([
            [
                'id' => 1,
                'status' => 'em_estoque',
                'material_descricao' => '=Filtro Especial',
                'quantidade' => '4.00',
                'quantidade_disponivel' => '3.00',
                'quantidade_baixada' => '1.00',
                'total_saidas' => 1,
                'unidade' => 'UN',
                'preco_compra' => '100.00',
                'data_entrada' => '2026-11-01',
                'fornecedor_nf' => 'NF 123',
                'site' => 'BMADTC',
                'observacoes' => 'Obs de teste',
                'created_at' => '2026-11-01 10:00:00',
                'updated_at' => '2026-11-01 10:00:00',
            ]
        ]);

        $service = new EstoqueMaterialService($repoMock);
        $csv = $service->exportCsv();

        // Check UTF-8 BOM
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        // Check delimiter and headers
        $this->assertStringContainsString('"Status";"Material / Descrição";', $csv);
        // Check CSV injection sanitization in content
        $this->assertStringContainsString(';"\'=Filtro Especial";', $csv);
    }
}
