<?php

namespace Tests\Unit;

use App\Api\Middleware\RateLimitMiddleware;
use PHPUnit\Framework\TestCase;

/**
 * Auditoria 2026-10-16 (Fase 1): rate limits faltando em 7 rotas.
 * Estas rotas aceitam mutacoes ou disparam trabalho pesado/cron sem throttle.
 */
class RateLimitMiddlewareAuditTest extends TestCase
{
    /** @var array<string, array<string, int>> */
    private array $limits;

    protected function setUp(): void
    {
        parent::setUp();
        $ref = new \ReflectionClass(RateLimitMiddleware::class);
        $this->limits = $ref->getConstants()['LIMITS'] ?? [];
    }

    public function testFilterExchangesIsRateLimited(): void
    {
        $this->assertArrayHasKey('filter-exchanges', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['filter-exchanges']);
        $this->assertArrayHasKey('PATCH', $this->limits['filter-exchanges']);
        $this->assertArrayHasKey('DELETE', $this->limits['filter-exchanges']);
    }

    public function testPendingTicketsIsRateLimited(): void
    {
        $this->assertArrayHasKey('pending-tickets', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['pending-tickets']);
        $this->assertArrayHasKey('DELETE', $this->limits['pending-tickets']);
        $this->assertArrayHasKey('PATCH', $this->limits['pending-tickets']);
    }

    public function testPreventivaIsRateLimited(): void
    {
        $this->assertArrayHasKey('preventiva', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['preventiva']);
        $this->assertArrayHasKey('DELETE', $this->limits['preventiva']);
    }

    public function testEquipmentPricesIsRateLimited(): void
    {
        $this->assertArrayHasKey('equipment-prices', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['equipment-prices']);
        $this->assertArrayHasKey('PUT', $this->limits['equipment-prices']);
        $this->assertArrayHasKey('DELETE', $this->limits['equipment-prices']);
    }

    public function testPdfAuditIsRateLimited(): void
    {
        // POST executa audit com CLIP (pesado) — limite mais restritivo.
        $this->assertArrayHasKey('pdf-audit', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['pdf-audit']);
        $this->assertLessThanOrEqual(10, $this->limits['pdf-audit']['POST']);
    }

    public function testPreditivaParseIsRateLimited(): void
    {
        $this->assertArrayHasKey('preditiva-parse', $this->limits);
        $this->assertArrayHasKey('POST', $this->limits['preditiva-parse']);
        $this->assertLessThanOrEqual(10, $this->limits['preditiva-parse']['POST']);
    }

    public function testNotifyIsRateLimitedBecauseItSendsEmails(): void
    {
        // notify e GET mas dispara envio de e-mails (cron sob demanda).
        $this->assertArrayHasKey('notify', $this->limits);
        $this->assertArrayHasKey('GET', $this->limits['notify']);
        $this->assertLessThanOrEqual(10, $this->limits['notify']['GET']);
    }

    public function testAllLimitsArePositiveIntegers(): void
    {
        foreach ($this->limits as $route => $methods) {
            foreach ($methods as $method => $limit) {
                $this->assertIsInt($limit, "{$route}:{$method}");
                $this->assertGreaterThan(0, $limit, "{$route}:{$method}");
                $this->assertLessThanOrEqual(120, $limit, "{$route}:{$method}");
            }
        }
    }
}
