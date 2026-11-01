<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Services\PvEmailWatcherService;

class PvEmailWatcherServiceTest extends TestCase
{
    private PvEmailWatcherService $service;

    protected function setUp(): void
    {
        $this->service = new PvEmailWatcherService();
    }

    public function testDecodeBodyRaw(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        $this->assertEquals('hello world', $method->invoke($this->service, 'hello world', 0));
    }

    public function testDecodeBody8BitDoesNotCorruptText(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        $text = 'Aprovado aquisição de material e serviço!';
        // Encoding 1 (8BIT) não deve passar por base64_decode
        $this->assertEquals($text, $method->invoke($this->service, $text, 1));
    }

    public function testDecodeBodyBase64(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        // Encoding 3 é ENCBASE64
        $this->assertEquals('hello world', $method->invoke($this->service, base64_encode('hello world'), 3));
    }

    public function testDecodeBodyQuotedPrintable(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        // Encoding 4 é ENCQUOTEDPRINTABLE
        $encoded = quoted_printable_encode('hello world');
        $this->assertEquals('hello world', $method->invoke($this->service, $encoded, 4));
    }

    public function testResolveMailboxesDefaultsToInbox(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseMailboxConfig');
        $result = $method->invoke($this->service, 'INBOX');
        $this->assertEquals(['INBOX'], $result);
    }

    public function testParseMailboxConfigMultiple(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseMailboxConfig');
        $result = $method->invoke($this->service, 'INBOX,INBOX/PVs,INBOX/Archive');
        $this->assertEquals(['INBOX', 'INBOX/PVs', 'INBOX/Archive'], $result);
    }

    public function testParseMailboxConfigTrimsSpaces(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseMailboxConfig');
        $result = $method->invoke($this->service, 'INBOX, INBOX/PVs, INBOX/Arquivo');
        $this->assertEquals(['INBOX', 'INBOX/PVs', 'INBOX/Arquivo'], $result);
    }

    public function testGetBodySearchTargetsAprovad(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('getBodySearchPattern');
        $this->assertEquals('/aprovad/i', $method->invoke($this->service));
    }

    public function testDecodeSubjectPlain(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeSubject');
        $this->assertEquals('PV: 260025 - Sala A', $method->invoke($this->service, "Subject: PV: 260025 - Sala A\r\n"));
    }

    public function testDecodeSubjectEncodedWord(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeSubject');
        $this->assertEquals(
            'PV: 260025 - Sala A',
            $method->invoke($this->service, "Subject: =?UTF-8?Q?PV:_260025_-_Sala_A?=\r\n")
        );
    }

    public function testDecodeSubjectFoldedContinuation(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeSubject');
        $this->assertEquals(
            'PV: 260025 - Sala A',
            $method->invoke($this->service, "Subject: PV: 260025 - \r\n Sala A\r\n")
        );
    }

    public function testDecodeSubjectMalformedFallsBackToRaw(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeSubject');
        $result = $method->invoke($this->service, "Subject: =?UTF-8?Q?quebrado\r\n");
        $this->assertNotEquals('', $result);
    }

    public function testExtractPvNumberColonAndSpaces(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('extractPvNumber');
        $this->assertEquals('260025', $method->invoke($this->service, 'PV: 260025 - Sala A'));
    }

    public function testExtractPvNumberNoColon(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('extractPvNumber');
        $this->assertEquals('260025', $method->invoke($this->service, 'PV260025 - Sala A'));
    }

    public function testExtractPvNumberNoMatch(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('extractPvNumber');
        $this->assertNull($method->invoke($this->service, '260025'));
        $this->assertNull($method->invoke($this->service, 'Proposta para faturamento'));
    }

    public function testIsInboxFolderReturnsTrueForInbox(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('isInboxFolder');
        $prefix = '{imap.example.com:993/imap/ssl}';
        $this->assertTrue($method->invoke($this->service, $prefix . 'INBOX', $prefix));
        $this->assertTrue($method->invoke($this->service, $prefix . 'INBOX/PVs', $prefix));
        $this->assertTrue($method->invoke($this->service, $prefix . 'INBOX/2024/Projetos', $prefix));
        $this->assertFalse($method->invoke($this->service, $prefix . 'Sent Items', $prefix));
        $this->assertFalse($method->invoke($this->service, $prefix . '[Gmail]/Spam', $prefix));
    }

    public function testBuildServerPrefixDefaultsToSsl(): void
    {
        putenv('IMAP_SECURITY');
        unset($_ENV['IMAP_SECURITY']);
        $service = (new \ReflectionClass($this->service))->newInstanceWithoutConstructor();
        $method = new \ReflectionMethod($service, 'buildServerPrefix');
        $this->assertEquals('{mail:143/imap/ssl}', $method->invoke($service, 'mail', '143'));
        $this->assertEquals('{imap.example.com:993/imap/ssl}', $method->invoke($service, 'imap.example.com', '993'));
    }

    public function testBuildServerPrefixPlain(): void
    {
        putenv('IMAP_SECURITY=plain');
        $_ENV['IMAP_SECURITY'] = 'plain';
        $service = (new \ReflectionClass($this->service))->newInstanceWithoutConstructor();
        $method = new \ReflectionMethod($service, 'buildServerPrefix');
        $this->assertEquals('{mail:143/imap}', $method->invoke($service, 'mail', '143'));
        putenv('IMAP_SECURITY');
        unset($_ENV['IMAP_SECURITY']);
    }

    public function testBuildMailboxKeyCombinesHostAndUser(): void
    {
        putenv('IMAP_HOST=imap.gmail.com');
        $_ENV['IMAP_HOST'] = 'imap.gmail.com';
        putenv('IMAP_USER=rubbleaprovacoes@gmail.com');
        $_ENV['IMAP_USER'] = 'rubbleaprovacoes@gmail.com';
        $service = (new \ReflectionClass($this->service))->newInstanceWithoutConstructor();
        $method = new \ReflectionMethod($service, 'buildMailboxKey');
        $this->assertEquals(
            'imap.gmail.com:rubbleaprovacoes@gmail.com',
            $method->invoke($service)
        );
        putenv('IMAP_HOST');
        unset($_ENV['IMAP_HOST']);
        putenv('IMAP_USER');
        unset($_ENV['IMAP_USER']);
    }

    public function testBuildMailboxKeyEmptyWhenEnvMissing(): void
    {
        putenv('IMAP_HOST');
        unset($_ENV['IMAP_HOST']);
        putenv('IMAP_USER');
        unset($_ENV['IMAP_USER']);
        $service = (new \ReflectionClass($this->service))->newInstanceWithoutConstructor();
        $method = new \ReflectionMethod($service, 'buildMailboxKey');
        $this->assertEquals('', $method->invoke($service));
    }

    public function testExtractPvNumbersSingleAndBatch(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('extractPvNumbers');

        // Individual com dois pontos
        $this->assertEquals(['260025'], $method->invoke($this->service, 'PV: 260025 - Sala A'));

        // Individual sem dois pontos
        $this->assertEquals(['260025'], $method->invoke($this->service, 'PV260025 - Sala A'));

        // Lote com PVs:
        $this->assertEquals(['260025', '260026'], $method->invoke($this->service, 'PVs: 260025, 260026 - Aquisição'));

        // Resposta em lote (Re: / RES:)
        $this->assertEquals(
            ['260025', '260026', '260027'],
            $method->invoke($this->service, 'RES: PVs: 260025, 260026, 260027 - Servicos')
        );
    }

    public function testExtractPvNumbersFromBody(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('extractPvNumbersFromBody');

        $body = "Bom dia,\nSegue aprovação conforme solicitado para a PV: 260099.\nAtenciosamente,";
        $this->assertEquals(['260099'], $method->invoke($this->service, $body));

        $batchBody = "Aprovado as PVs: 260010, 260011.";
        $this->assertEquals(['260010', '260011'], $method->invoke($this->service, $batchBody));
    }

    public function testIsApprovalMessagePositive(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('isApprovalMessage');

        $this->assertTrue($method->invoke($this->service, 'Aprovado aquisição de material'));
        $this->assertTrue($method->invoke($this->service, 'Aprovada a solicitação da proposta'));
        $this->assertTrue($method->invoke($this->service, 'Aprovo a realização do serviço'));
        $this->assertTrue($method->invoke($this->service, 'Aprovamos os itens'));
        $this->assertTrue($method->invoke($this->service, 'De acordo com o orçamento apresentado'));
        $this->assertTrue($method->invoke($this->service, 'Autorizado o faturamento'));
        $this->assertTrue($method->invoke($this->service, 'Autorizo a continuidade do reparo'));
    }

    public function testIsApprovalMessageNegative(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('isApprovalMessage');

        $this->assertFalse($method->invoke($this->service, 'Reprovado o orçamento devido ao valor'));
        $this->assertFalse($method->invoke($this->service, 'Não aprovado pelo gerente'));
        $this->assertFalse($method->invoke($this->service, 'Nao aprovado'));
        $this->assertFalse($method->invoke($this->service, 'Recusado o orçamento'));
        $this->assertFalse($method->invoke($this->service, 'Não autorizo este serviço'));
        $this->assertFalse($method->invoke($this->service, 'Favor enviar maiores esclarecimentos'));
    }

    public function testNestedMultipartExtraction(): void
    {
        // Cria estrutura aninhada real:
        // multipart/mixed (nível 1)
        //   part 1: multipart/alternative (nível 1.1)
        //     part 1.1: text/plain (nível 1.1.1)
        //     part 1.2: text/html  (nível 1.1.2)
        //   part 2: application/pdf (anexo)
        $subSubPlain = (object) [
            'type' => 0,
            'subtype' => 'PLAIN',
            'encoding' => 0,
            'parameters' => [(object) ['attribute' => 'charset', 'value' => 'UTF-8']]
        ];

        $subSubHtml = (object) [
            'type' => 0,
            'subtype' => 'HTML',
            'encoding' => 0,
            'parameters' => [(object) ['attribute' => 'charset', 'value' => 'UTF-8']]
        ];

        $subAlternative = (object) [
            'type' => 1,
            'subtype' => 'ALTERNATIVE',
            'parts' => [$subSubPlain, $subSubHtml]
        ];

        $attachment = (object) [
            'type' => 3,
            'subtype' => 'OCTET-STREAM',
            'encoding' => 3,
        ];

        $rootMixed = (object) [
            'type' => 1,
            'subtype' => 'MIXED',
            'parts' => [$subAlternative, $attachment]
        ];

        $watcher = new class extends PvEmailWatcherService {
            public function __construct() {}
            public array $parts = [];
            protected function getPartBody($mbox, int $uid, string $partNum): string|false
            {
                return $this->parts[$partNum] ?? false;
            }
        };

        $watcher->parts['1.1'] = "Aprovado o serviço solicitado na PV.";
        $watcher->parts['1.2'] = "<p>Aprovado o serviço solicitado na PV.</p>";

        $reflection = new \ReflectionClass(PvEmailWatcherService::class);
        $collectMethod = $reflection->getMethod('collectTextParts');

        $plainParts = [];
        $htmlParts = [];
        $collectMethod->invokeArgs($watcher, [null, 1, $rootMixed, '', &$plainParts, &$htmlParts]);

        $this->assertCount(1, $plainParts);
        $this->assertEquals("Aprovado o serviço solicitado na PV.", $plainParts[0]);
        $this->assertCount(1, $htmlParts);
        $this->assertEquals("<p>Aprovado o serviço solicitado na PV.</p>", $htmlParts[0]);
    }

    public function testDeepNestedThreeLevelMultipartExtraction(): void
    {
        // Estrutura com 3 níveis de profundidade:
        // mixed (root)
        //   part 1: mixed
        //     part 1.1: alternative
        //       part 1.1.1: text/plain
        //       part 1.1.2: text/html
        $plain = (object) [
            'type' => 0,
            'subtype' => 'PLAIN',
            'encoding' => 0,
        ];

        $html = (object) [
            'type' => 0,
            'subtype' => 'HTML',
            'encoding' => 0,
        ];

        $alternative = (object) [
            'type' => 1,
            'subtype' => 'ALTERNATIVE',
            'parts' => [$plain, $html],
        ];

        $innerMixed = (object) [
            'type' => 1,
            'subtype' => 'MIXED',
            'parts' => [$alternative],
        ];

        $root = (object) [
            'type' => 1,
            'subtype' => 'MIXED',
            'parts' => [$innerMixed],
        ];

        $watcher = new class extends PvEmailWatcherService {
            public function __construct() {}
            public array $parts = [];
            protected function getPartBody($mbox, int $uid, string $partNum): string|false
            {
                return $this->parts[$partNum] ?? false;
            }
        };

        $watcher->parts['1.1.1'] = "Aprovado em 3 níveis!";
        $watcher->parts['1.1.2'] = "<p>Aprovado em 3 níveis!</p>";

        $reflection = new \ReflectionClass(PvEmailWatcherService::class);
        $collectMethod = $reflection->getMethod('collectTextParts');

        $plainParts = [];
        $htmlParts = [];
        $collectMethod->invokeArgs($watcher, [null, 1, $root, '', &$plainParts, &$htmlParts]);

        $this->assertCount(1, $plainParts);
        $this->assertEquals("Aprovado em 3 níveis!", $plainParts[0]);
        $this->assertCount(1, $htmlParts);
        $this->assertEquals("<p>Aprovado em 3 níveis!</p>", $htmlParts[0]);
    }
}
