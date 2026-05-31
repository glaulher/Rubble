<?php

namespace Tests\Unit;

use App\Api\Helpers\Request;
use PHPUnit\Framework\TestCase;

class RequestTest extends TestCase
{
    protected function setUp(): void
    {
        $_GET = [];
        $_SERVER = [];
    }

    public function testGetReturnsValueWhenFieldExists(): void
    {
        $_GET['page'] = '2';
        $this->assertSame('2', Request::get('page'));
    }

    public function testGetReturnsDefaultWhenFieldMissing(): void
    {
        $this->assertNull(Request::get('page'));
    }

    public function testGetReturnsCustomDefaultWhenFieldMissing(): void
    {
        $this->assertSame(1, Request::get('page', 1));
    }

    public function testGetReturnsDefaultForNullValue(): void
    {
        $_GET['page'] = null;
        $this->assertNull(Request::get('page'));
    }

    public function testMethodReturnsServerRequestMethod(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $this->assertSame('POST', Request::method());
    }

    public function testMethodReturnsEmptyWhenNotSet(): void
    {
        $this->assertSame('', Request::method());
    }
}
