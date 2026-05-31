<?php

namespace Tests\Unit;

use App\Api\Auth\JwtHelper;
use PHPUnit\Framework\TestCase;

class JwtHelperTest extends TestCase
{
    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();
        $this->secret = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    }

    public function testEncodeReturnsStringWithThreeParts(): void
    {
        $token = JwtHelper::encode(['user_id' => 1, 'role' => 'admin'], $this->secret);
        $parts = explode('.', $token);
        $this->assertCount(3, $parts);
    }

    public function testDecodeReturnsPayloadWhenTokenIsValid(): void
    {
        $payload = ['user_id' => 1, 'role' => 'admin', 'nome' => 'Admin'];
        $token = JwtHelper::encode($payload, $this->secret);
        $decoded = JwtHelper::decode($token, $this->secret);
        $this->assertSame(1, $decoded->user_id);
        $this->assertSame('admin', $decoded->role);
        $this->assertSame('Admin', $decoded->nome);
    }

    public function testDecodeReturnsNullWhenSignatureIsInvalid(): void
    {
        $token = JwtHelper::encode(['user_id' => 1], $this->secret);
        $parts = explode('.', $token);
        $tampered = $parts[0] . '.' . $parts[1] . '.invalidsignature';
        $result = JwtHelper::decode($tampered, $this->secret);
        $this->assertNull($result);
    }

    public function testDecodeReturnsNullWhenTokenIsMalformed(): void
    {
        $result = JwtHelper::decode('not-a-valid-token', $this->secret);
        $this->assertNull($result);
    }

    public function testDecodeReturnsNullWhenPayloadIsNotJson(): void
    {
        $header = JwtHelper::base64urlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = JwtHelper::base64urlEncode('not-json');
        $signature = JwtHelper::base64urlEncode(
            hash_hmac('sha256', "$header.$payload", $this->secret, true)
        );
        $token = "$header.$payload.$signature";
        $result = JwtHelper::decode($token, $this->secret);
        $this->assertNull($result);
    }

    public function testEncodeIncludesIatClaim(): void
    {
        $token = JwtHelper::encode(['user_id' => 1], $this->secret);
        $decoded = JwtHelper::decode($token, $this->secret);
        $this->assertObjectHasProperty('iat', $decoded);
        $this->assertIsInt($decoded->iat);
    }

    public function testDecodeWithWrongSecretReturnsNull(): void
    {
        $token = JwtHelper::encode(['user_id' => 1], $this->secret);
        $result = JwtHelper::decode($token, 'different-secret-1234567890-different-secret-');
        $this->assertNull($result);
    }
}
