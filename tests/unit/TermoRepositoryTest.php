<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Api\Repositories\TermoRepository;
use mysqli;

class TermoRepositoryTest extends TestCase
{
    private TermoRepository $repository;

    protected function setUp(): void
    {
        $mysqliMock = $this->createMock(mysqli::class);
        $this->repository = new TermoRepository($mysqliMock);
    }

    public function testRepositoryClassExists(): void
    {
        $this->assertInstanceOf(TermoRepository::class, $this->repository);
    }

    public function testGetNextCodeDefault(): void
    {
        $code = $this->repository->formatCode(1, 2026);
        $this->assertSame('TR-2026-0001', $code);

        $code2 = $this->repository->formatCode(42, 2026);
        $this->assertSame('TR-2026-0042', $code2);
    }
}
