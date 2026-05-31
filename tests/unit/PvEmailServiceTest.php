<?php

namespace Tests\Unit;

use App\Api\Services\PvEmailService;
use PHPUnit\Framework\TestCase;

class PvEmailServiceTest extends TestCase
{
    // --- send ---

    public function testSendReturnsErrorForInvalidSubject(): void
    {
        $pv = [
            'id' => 1,
            'numero_pv' => '26001',
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => 5,
            'tickets' => [['os' => '1234']],
        ];

        $service = new PvEmailService();
        $result = $service->send($pv, [], 'invalid_subject');

        $this->assertFalse($result['success']);
        $this->assertSame('Assunto inválido', $result['message']);
    }

    public function testSendReturnsErrorWhenPvHasNoOs(): void
    {
        $pv = [
            'id' => 1,
            'numero_pv' => '26001',
            'local' => 'Sala A',
            'status' => 'ativo',
            'equipamento_id' => 5,
            'tickets' => [],
        ];

        $service = new PvEmailService();
        $result = $service->send($pv, [], 'materiais');

        $this->assertFalse($result['success']);
        $this->assertSame('PV não possui número de OS', $result['message']);
    }
}
