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

    public function testDecodeBodyBase64(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        $this->assertEquals('hello world', $method->invoke($this->service, base64_encode('hello world'), 1));
    }

    public function testDecodeBodyQuotedPrintable(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('decodeBody');
        $encoded = quoted_printable_encode('hello world');
        $this->assertEquals('hello world', $method->invoke($this->service, $encoded, 2));
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
}
