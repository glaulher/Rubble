<?php

namespace Tests\Unit;

use App\Api\Auth\AuthService;
use PHPUnit\Framework\TestCase;

class AuthServiceTest extends TestCase
{
    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();
        $this->secret = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    }

    public function testValidateTokenReturnsUserWhenValid(): void
    {
        $payload = ['user_id' => 1, 'role' => 'admin', 'username' => 'admin'];
        $token = \App\Api\Auth\JwtHelper::encode($payload, $this->secret);
        $user = AuthService::validateToken($token, $this->secret);
        $this->assertIsObject($user);
        $this->assertSame(1, $user->user_id);
        $this->assertSame('admin', $user->role);
    }

    public function testValidateTokenReturnsNullWhenInvalid(): void
    {
        $user = AuthService::validateToken('invalid.token.here', $this->secret);
        $this->assertNull($user);
    }

    public function testValidateTokenReturnsNullWhenEmpty(): void
    {
        $user = AuthService::validateToken('', $this->secret);
        $this->assertNull($user);
    }

    public function testRequireRoleAdminAllowsAdminOnAnyRoute(): void
    {
        $user = (object)['role' => 'admin'];
        $result = AuthService::requireRole($user, 'equipment', 'GET', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleAdminAllowsPvDelete(): void
    {
        $user = (object)['role' => 'admin'];
        $result = AuthService::requireRole($user, 'pv', 'DELETE', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleSupervisorDeniesPv(): void
    {
        $user = (object)['role' => 'supervisor'];
        $result = AuthService::requireRole($user, 'pv', 'GET', null);
        $this->assertFalse($result);
    }

    public function testRequireRoleSupervisorAllowsHome(): void
    {
        $user = (object)['role' => 'supervisor'];
        $result = AuthService::requireRole($user, 'equipment', 'GET', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleCoordenadorAllowsPvGet(): void
    {
        $user = (object)['role' => 'coordenador'];
        $result = AuthService::requireRole($user, 'pv', 'GET', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleCoordenadorDeniesPvDelete(): void
    {
        $user = (object)['role' => 'coordenador'];
        $result = AuthService::requireRole($user, 'pv', 'DELETE', null);
        $this->assertFalse($result);
    }

    public function testRequireRoleClienteDeniesPv(): void
    {
        $user = (object)['role' => 'cliente'];
        $result = AuthService::requireRole($user, 'pv', 'GET', null);
        $this->assertFalse($result);
    }

    public function testRequireRoleClienteAllowsHomeRead(): void
    {
        $user = (object)['role' => 'cliente'];
        $result = AuthService::requireRole($user, 'equipment', 'GET', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleClienteDeniesHomeWrite(): void
    {
        $user = (object)['role' => 'cliente'];
        $result = AuthService::requireRole($user, 'tickets', 'POST', null);
        $this->assertFalse($result);
    }

    public function testRequireRoleAdminAllowsUserManagement(): void
    {
        $user = (object)['role' => 'admin'];
        $result = AuthService::requireRole($user, 'auth', 'POST', null);
        $this->assertTrue($result);
    }

    public function testRequireRoleSupervisorDeniesUserManagement(): void
    {
        $user = (object)['role' => 'supervisor'];
        $result = AuthService::requireRole($user, 'auth', 'POST', null);
        $this->assertFalse($result);
    }

    public function testRequireRoleReturnsTrueForUnknownRoute(): void
    {
        $user = (object)['role' => 'admin'];
        $result = AuthService::requireRole($user, 'unknown-route', 'GET', null);
        $this->assertTrue($result);
    }
}
