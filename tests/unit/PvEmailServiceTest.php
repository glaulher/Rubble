<?php

namespace Tests\Unit;

use App\Api\Services\PvEmailService;
use PHPUnit\Framework\TestCase;

class PvEmailServiceTest extends TestCase
{
    // --- send ---

    public function testSendReturnsErrorForInvalidSubject(): void
    {
        $pv = [
            'id' => 1,
            'numero_pv' => '26001',
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => 5,
            'tickets' => [['os' => '1234']],
        ];

        $service = new PvEmailService();
        $result = $service->send($pv, [], 'invalid_subject');

        $this->assertFalse($result['success']);
        $this->assertSame('Assunto inválido', $result['message']);
    }

    public function testSendReturnsErrorWhenPvHasNoOs(): void
    {
        $pv = [
            'id' => 1,
            'numero_pv' => '26001',
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => 5,
            'tickets' => [],
        ];

        $service = new PvEmailService();
        $result = $service->send($pv, [], 'materiais');

        $this->assertFalse($result['success']);
        $this->assertSame('PV não possui número de OS', $result['message']);
    }

    // --- buildPlainText ---

    public function testBuildPlainTextConvertsParagraphsToNewlines(): void
    {
        $this->assertSame("Olá\nMundo", PvEmailService::buildPlainText('<p>Olá</p><p>Mundo</p>'));
    }

    public function testBuildPlainTextBreaksBrTags(): void
    {
        $this->assertSame("Linha 1\nLinha 2", PvEmailService::buildPlainText('Linha 1<br>Linha 2'));
    }

    public function testBuildPlainTextSpacesTableCells(): void
    {
        $this->assertSame('A B', PvEmailService::buildPlainText('<tr><td>A</td><td>B</td></tr>'));
    }

    public function testBuildPlainTextDecodesEntities(): void
    {
        $this->assertSame('Custo & prazo', PvEmailService::buildPlainText('<p>Custo &amp; prazo</p>'));
    }

    public function testBuildPlainTextCollapsesBlankLines(): void
    {
        $this->assertSame("a\nb", PvEmailService::buildPlainText("<p>a</p>\n\n\n<p>b</p>"));
    }

    public function testBuildPlainTextReturnsEmptyForEmptyHtml(): void
    {
        $this->assertSame('', PvEmailService::buildPlainText(''));
    }
}
