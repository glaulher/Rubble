<?php

namespace Tests\Unit;

use App\Api\Auth\JwtHelper;
use PHPUnit\Framework\TestCase;

/**
 * Auditoria 2026-10-16 (Fase 1): JWT compartilhado com Tempo Fechado/
 * Combustivel sem validacao de iss. Rubble agora so aceita tokens emitidos
 * por ele mesmo (iss='rubble'); tokens de outros emissores sao rejeitados.
 * Tokens legados (pre-deploy, sem iss) sao aceitos apenas com o shape Rubble
 * (username+role+user_id) — mesma regra que o Tempo Fechado usa ao contrario.
 */
class JwtHelperIssuerTest extends TestCase
{
    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();
        $this->secret = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    }

    private function craftToken(array $payload): string
    {
        $header = JwtHelper::base64urlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $body = JwtHelper::base64urlEncode(json_encode($payload));
        $signature = JwtHelper::base64urlEncode(
            hash_hmac('sha256', "$header.$body", $this->secret, true)
        );
        return "$header.$body.$signature";
    }

    public function testEncodeSetsRubbleIssuer(): void
    {
        $token = JwtHelper::encode(['user_id' => 1, 'username' => 'a@b.c', 'role' => 'admin'], $this->secret);
        $decoded = JwtHelper::decode($token, $this->secret);

        $this->assertObjectHasProperty('iss', $decoded);
        $this->assertSame('rubble', $decoded->iss);
    }

    public function testDecodeAcceptsRubbleIssuerToken(): void
    {
        $token = $this->craftToken([
            'iss' => 'rubble',
            'user_id' => 1,
            'username' => 'a@b.c',
            'role' => 'admin',
            'exp' => time() + 3600,
        ]);

        $this->assertNotNull(JwtHelper::decode($token, $this->secret));
    }

    public function testDecodeRejectsTempoFechadoIssuerToken(): void
    {
        // Mesmo secret compartilhado, emissor diferente (SSO cruzado).
        $token = $this->craftToken([
            'iss' => 'tempo-fechado',
            'sub' => 'admin',
            'perfil' => 'admin',
            'exp' => time() + 3600,
        ]);

        $this->assertNull(JwtHelper::decode($token, $this->secret));
    }

    public function testDecodeRejectsUnknownIssuerToken(): void
    {
        $token = $this->craftToken([
            'iss' => 'qualquer-outro-servico',
            'user_id' => 1,
            'username' => 'a@b.c',
            'role' => 'admin',
            'exp' => time() + 3600,
        ]);

        $this->assertNull(JwtHelper::decode($token, $this->secret));
    }

    public function testDecodeAcceptsLegacyTokenWithoutIssuerAndRubbleShape(): void
    {
        // Token emitido antes do deploy (sem iss) — janela de TTL de 12h.
        $token = $this->craftToken([
            'user_id' => 1,
            'username' => 'a@b.c',
            'role' => 'admin',
            'exp' => time() + 3600,
        ]);

        $this->assertNotNull(JwtHelper::decode($token, $this->secret));
    }

    public function testDecodeRejectsLegacyTokenWithoutIssuerAndWithoutRubbleShape(): void
    {
        $token = $this->craftToken([
            'sub' => 'admin',
            'perfil' => 'admin',
            'exp' => time() + 3600,
        ]);

        $this->assertNull(JwtHelper::decode($token, $this->secret));
    }
}
