<?php

namespace Tests\Unit;

use App\Api\Services\AuditService;
use PHPUnit\Framework\TestCase;

class AuditServiceTest extends TestCase
{
    public function testParseUserAgentIdentifiesBrowsersAndOs(): void
    {
        $chromeWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
        $this->assertSame('Chrome 125 (Windows 10/11)', AuditService::parseUserAgent($chromeWin));

        $firefoxLinux = 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0';
        $this->assertSame('Firefox 126 (Linux)', AuditService::parseUserAgent($firefoxLinux));

        $edgeWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
        $this->assertSame('Edge 124 (Windows 10/11)', AuditService::parseUserAgent($edgeWin));

        $safariIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
        $this->assertSame('Safari 604 (iOS)', AuditService::parseUserAgent($safariIos));

        $empty = '';
        $this->assertSame('Desconhecido', AuditService::parseUserAgent($empty));
    }

    public function testDiffCalculationInAuditDetail(): void
    {
        $repoMock = $this->createMock(\App\Api\Repositories\AuditRepository::class);
        $repoMock->method('getAuditLogById')->willReturn([
            'id' => 10,
            'user_id' => 1,
            'username' => 'admin@rubble.com',
            'nome' => 'Administrador',
            'role' => 'admin',
            'module' => 'usuarios',
            'action' => 'update',
            'record_id' => 'Usuário #2',
            'summary' => 'Atualizou o usuário',
            'old_values' => json_encode(['nome' => 'João Silva', 'role' => 'supervisor', 'cidade' => 'RJ']),
            'new_values' => json_encode(['nome' => 'João da Silva', 'role' => 'coordenador', 'cidade' => 'RJ']),
            'ip_address' => '127.0.0.1',
            'created_at' => '2026-10-08 14:00:00',
        ]);

        $service = new AuditService($repoMock);
        $detail = $service->getAuditDetail(10);

        $this->assertNotNull($detail);
        $this->assertArrayHasKey('diff', $detail);

        $diff = $detail['diff'];
        $this->assertArrayHasKey('nome', $diff);
        $this->assertSame('João Silva', $diff['nome']['old']);
        $this->assertSame('João da Silva', $diff['nome']['new']);

        $this->assertArrayHasKey('role', $diff);
        $this->assertSame('supervisor', $diff['role']['old']);
        $this->assertSame('coordenador', $diff['role']['new']);

        // 'cidade' didn't change, so shouldn't be in diff
        $this->assertArrayNotHasKey('cidade', $diff);
    }
}
