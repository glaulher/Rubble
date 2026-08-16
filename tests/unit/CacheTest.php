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
        Cache::delete('pending_tickets:abc123');
        Cache::delete('other_prefix:xyz');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        Cache::delete('test_key');
        Cache::delete('pending_tickets:abc123');
        Cache::delete('other_prefix:xyz');
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

    public function testTrackedKeyWithTrailingColon(): void
    {
        $this->assertEquals('_tracked:pending_tickets', Cache::trackedKey('pending_tickets:'));
    }

    public function testTrackedKeyWithoutColon(): void
    {
        $this->assertEquals('_tracked:pending_tickets', Cache::trackedKey('pending_tickets'));
    }

    public function testTrackedKeyMirrorsSetPrefix(): void
    {
        $this->assertEquals('_tracked:pending_tickets', Cache::trackedKey('pending_tickets:abc123'));
    }

    public function testDeleteByPrefixRemovesMatchingKeys(): void
    {
        Cache::set('pending_tickets:abc123', 'value', 10);
        Cache::deleteByPrefix('pending_tickets:');
        $this->assertNull(Cache::get('pending_tickets:abc123'));
    }

    public function testDeleteByPrefixKeepsOtherPrefixes(): void
    {
        Cache::set('pending_tickets:abc123', 'value', 10);
        Cache::set('other_prefix:xyz', 'value', 10);
        Cache::deleteByPrefix('pending_tickets:');
        $this->assertEquals('value', Cache::get('other_prefix:xyz'));
    }
}
