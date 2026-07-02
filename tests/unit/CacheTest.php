<?php

namespace Tests\Unit;

use App\Api\Helpers\Cache;
use PHPUnit\Framework\TestCase;

class CacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::delete('test_key');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        Cache::delete('test_key');
    }

    public function testSetAndGet(): void
    {
        Cache::set('test_key', ['data' => 'hello'], 10);
        $result = Cache::get('test_key');
        $this->assertEquals(['data' => 'hello'], $result);
    }

    public function testExpiredReturnsNull(): void
    {
        Cache::set('test_key', 'value', -1);
        $this->assertNull(Cache::get('test_key'));
    }

    public function testDeleteRemovesValue(): void
    {
        Cache::set('test_key', 'value', 10);
        Cache::delete('test_key');
        $this->assertNull(Cache::get('test_key'));
    }

    public function testGetNonExistentKeyReturnsNull(): void
    {
        $this->assertNull(Cache::get('non_existent_key_xyz'));
    }

    public function testBuildKey(): void
    {
        $key = Cache::buildKey('equipment', ['search' => 'test', 'page' => 0]);
        $expected = 'equipment:' . md5(serialize(['search' => 'test', 'page' => 0]));
        $this->assertEquals($expected, $key);
    }

    public function testBuildKeyDiffersForDifferentParams(): void
    {
        $key1 = Cache::buildKey('pv', ['status' => 'pendente']);
        $key2 = Cache::buildKey('pv', ['status' => 'planejado']);
        $this->assertNotEquals($key1, $key2);
    }

    public function testUpdateExistingKey(): void
    {
        Cache::set('test_key', 'first', 10);
        Cache::set('test_key', 'second', 10);
        $result = Cache::get('test_key');
        $this->assertEquals('second', $result);
    }
}
