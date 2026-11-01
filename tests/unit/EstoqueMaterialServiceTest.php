<?php

namespace Tests\Unit;

use App\Api\Repositories\EstoqueMaterialRepository;
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

    public function testValidateRejectsMissingSite(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Site é obrigatório.');

        $this->service->save([
            'material_descricao' => 'Filtro G4',
            'data_entrada' => '2026-11-01',
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
                'quantidade' => '2.00',
                'unidade' => 'UN',
                'preco_compra' => '100.00',
                'data_entrada' => '2026-11-01',
                'fornecedor_nf' => 'NF 123',
                'data_saida' => null,
                'tecnico_nome' => null,
                'numero_os' => null,
                'site' => 'BMADTC',
                'equipamento_id' => null,
                'equipamento_texto' => 'AC-01',
                'equipamento' => null,
                'capacidade' => null,
                'local' => null,
                'localidade' => null,
                'numero_pv' => null,
                'pv_item_id' => null,
                'pv_item_descricao' => null,
                'preco_venda' => null,
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
        $this->assertStringContainsString('"Status";"Material";', $csv);
        // Check CSV injection sanitization in content
        $this->assertStringContainsString(';"\'=Filtro Especial";', $csv);
    }
}
