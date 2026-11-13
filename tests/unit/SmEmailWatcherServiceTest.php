<?php

namespace Tests\Unit;

use App\Api\Services\SmEmailWatcherService;
use PHPUnit\Framework\TestCase;

class SmEmailWatcherServiceTest extends TestCase
{
    private SmEmailWatcherService $service;

    protected function setUp(): void
    {
        $this->service = new SmEmailWatcherService();
    }

    /** @dataProvider subjectProvider */
    public function test_extractSmNumber(string $subject, ?string $expected): void
    {
        $result = $this->service->extractSmNumber($subject);
        $this->assertSame($expected, $result);
    }

    public static function subjectProvider(): array
    {
        return [
            ['Re: SM: 260001 - HUB NITEROI', '260001'],
            ['Res: SM260002 - Solicitação de Materiais', '260002'],
            ['SM: 270003 cotação', '270003'],
            ['Sem número aqui', null],
            ['PV: 260091', null],
        ];
    }

    /** @dataProvider bodyProvider */
    public function test_isQuoteMessage(string $body, bool $expected): void
    {
        $result = $this->service->isQuoteMessage($body);
        $this->assertSame($expected, $result);
    }

    public static function bodyProvider(): array
    {
        return [
            ['Segue orçamento conforme solicitado.', true],
            ['segue orcamento para análise', true],
            ['Segue orçamento. Att.', true],
            ['Prezados, encaminho proposta.', false],
            ['Não temos o item em estoque.', false],
            ['', false],
        ];
    }
}
