<?php

namespace Tests\Unit;

use App\Api\Entities\EquipmentPrice;
use App\Api\Repositories\EquipmentPriceRepository;
use App\Api\Services\EquipmentPriceService;
use PHPUnit\Framework\TestCase;

class EquipmentPriceServiceTest extends TestCase
{
    private function createMockRepo(): EquipmentPriceRepository
    {
        return $this->createMock(EquipmentPriceRepository::class);
    }

    private function createService(?EquipmentPriceRepository $repo = null): EquipmentPriceService
    {
        return new EquipmentPriceService(
            $repo ?? $this->createMockRepo()
        );
    }

    private function makePrice(array $data = []): EquipmentPrice
    {
        return new EquipmentPrice(array_merge([
            'id' => '1',
            'nome' => 'tr',
            'equipamento_pattern' => '%TR%',
            'locais_especiais' => null,
            'mercado' => 'Residencial',
            'valor' => '94.00',
            'ativo' => '1',
        ], $data));
    }

    // --- listAll ---

    public function testListAllDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('listAll')->willReturn([
            $this->makePrice(),
            $this->makePrice(['id' => '2', 'nome' => 'chiller', 'valor' => '3642.14']),
        ]);

        $service = $this->createService($repo);
        $result = $service->listAll();

        $this->assertCount(2, $result);
        $this->assertSame('tr', $result[0]['nome']);
        $this->assertSame('chiller', $result[1]['nome']);
    }

    // --- getById ---

    public function testGetByIdReturnsArray(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn($this->makePrice());

        $service = $this->createService($repo);
        $result = $service->getById(1);

        $this->assertIsArray($result);
        $this->assertSame(1, $result['id']);
        $this->assertSame('tr', $result['nome']);
    }

    public function testGetByIdReturnsNullWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('getById')->willReturn(null);

        $service = $this->createService($repo);
        $this->assertNull($service->getById(999));
    }

    // --- save (validate + delegation) ---

    public function testSaveDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('save')
            ->willReturn(42);

        $service = $this->createService($repo);
        $result = $service->save([
            'nome' => 'tr',
            'equipamento_pattern' => '%TR%',
            'locais_especiais' => null,
            'mercado' => 'Residencial',
            'valor' => 94.00,
            'ativo' => 1,
        ]);

        $this->assertSame(42, $result);
    }

    public function testSaveWithEmptyMercadoSetsNull(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('save')
            ->willReturnCallback(function ($data) {
                $this->assertNull($data['mercado']);
                return 1;
            });

        $service = $this->createService($repo);
        $service->save([
            'nome' => 'tr',
            'equipamento_pattern' => '%TR%',
            'locais_especiais' => null,
            'mercado' => '',
            'valor' => 94.00,
            'ativo' => 1,
        ]);
    }

    public function testSaveThrowsForMissingNome(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Nome é obrigatório');

        $service->save([
            'nome' => '',
            'valor' => 94.00,
        ]);
    }

    public function testSaveThrowsForNegativeValor(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Valor deve ser maior ou igual a zero');

        $service->save([
            'nome' => 'tr',
            'valor' => -10,
        ]);
    }

    public function testSaveThrowsForInvalidMercado(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Mercado inválido');

        $service->save([
            'nome' => 'tr',
            'mercado' => 'Comercial',
            'valor' => 94.00,
        ]);
    }

    // --- update (validate + delegation) ---

    public function testUpdateDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('update')
            ->with(1, $this->callback(fn($data) => $data['nome'] === 'tr'))
            ->willReturn(true);

        $service = $this->createService($repo);
        $result = $service->update(1, [
            'nome' => 'tr',
            'equipamento_pattern' => '%TR%',
            'locais_especiais' => null,
            'mercado' => 'Residencial',
            'valor' => 94.00,
            'ativo' => 1,
        ]);

        $this->assertTrue($result);
    }

    public function testUpdateThrowsForMissingNome(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Nome é obrigatório');

        $service->update(1, ['nome' => '', 'valor' => 0]);
    }

    public function testUpdateThrowsForNegativeValor(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Valor deve ser maior ou igual a zero');

        $service->update(1, ['nome' => 'tr', 'valor' => -5]);
    }

    public function testUpdateThrowsForInvalidMercado(): void
    {
        $service = $this->createService();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Mercado inválido');

        $service->update(1, [
            'nome' => 'tr',
            'mercado' => 'Indústria',
            'valor' => 94.00,
        ]);
    }

    // --- delete ---

    public function testDeleteDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('delete')
            ->with(1)
            ->willReturn(true);

        $service = $this->createService($repo);
        $this->assertTrue($service->delete(1));
    }

    public function testDeleteReturnsFalseWhenNotFound(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('delete')->willReturn(false);

        $service = $this->createService($repo);
        $this->assertFalse($service->delete(999));
    }

    // --- resolvePrice ---

    public function testResolvePriceWithTrPattern(): void
    {
        $rules = [
            [
                'nome' => 'tr',
                'equipamento_pattern' => '%TR%',
                'locais_especiais' => null,
                'mercado' => 'Residencial',
                'valor' => '94.00',
            ],
        ];

        $repo = $this->createMockRepo();
        $repo->method('resolvePrice')->willReturnCallback(
            fn(string $equipamento, ?string $local, ?float $capacidade, ?array $r, ?string $m) =>
                $this->callResolvePrice($rules, $equipamento, $local, $capacidade)
        );

        $service = $this->createService($repo);
        $result = $service->resolvePrice('SELF TR 01', 'RSD', 10.0, $rules);

        $this->assertSame(940.0, $result);
    }

    public function testResolvePriceWithChillerPattern(): void
    {
        $rules = [
            [
                'nome' => 'chiller',
                'equipamento_pattern' => '%chiller%',
                'locais_especiais' => null,
                'mercado' => 'Empresarial',
                'valor' => '3642.14',
            ],
        ];

        $repo = $this->createMockRepo();
        $repo->method('resolvePrice')->willReturn(3642.14);

        $service = $this->createService($repo);
        $result = $service->resolvePrice('CHILLER 01', 'RJDQC91', null, $rules);

        $this->assertSame(3642.14, $result);
    }

    public function testResolvePriceReturnsZeroWhenNoRulesMatch(): void
    {
        $repo = $this->createMockRepo();
        $repo->method('resolvePrice')->willReturn(0.0);

        $service = $this->createService($repo);
        $result = $service->resolvePrice('UNKNOWN', 'RSD', 10.0, []);

        $this->assertSame(0.0, $result);
    }

    public function testResolvePriceDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('resolvePrice')
            ->with('SELF TR 01', 'RSD', 10.0, null, 'Residencial')
            ->willReturn(940.0);

        $service = $this->createService($repo);
        $result = $service->resolvePrice('SELF TR 01', 'RSD', 10.0, null, 'Residencial');

        $this->assertSame(940.0, $result);
    }

    // --- getActiveRules ---

    public function testGetActiveRulesDelegatesToRepository(): void
    {
        $repo = $this->createMockRepo();
        $repo->expects($this->once())
            ->method('getActiveRules')
            ->willReturn([
                ['nome' => 'tr', 'valor' => '94.00'],
            ]);

        $service = $this->createService($repo);
        $result = $service->getActiveRules();

        $this->assertCount(1, $result);
        $this->assertSame('tr', $result[0]['nome']);
    }

    private function callResolvePrice(array $rules, string $equipamento, ?string $local, ?float $capacidade): float
    {
        foreach ($rules as $rule) {
            if (!empty($rule['equipamento_pattern'])) {
                $pattern = $rule['equipamento_pattern'];
                $regex = '/^' . str_replace(['%', '_'], ['.*', '.'], preg_quote($pattern, '/')) . '$/i';
                if (!preg_match($regex, $equipamento)) {
                    continue;
                }
            }
            if ($rule['nome'] === 'tr') {
                return round($capacidade * (float) $rule['valor'], 2);
            }
            return (float) $rule['valor'];
        }
        return 0.0;
    }
}
