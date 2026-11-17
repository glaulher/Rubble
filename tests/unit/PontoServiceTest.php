<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Api\Services\PontoService;
use PHPUnit\Framework\TestCase;

class PontoServiceTest extends TestCase
{
    private PontoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PontoService();
    }

    public function testTimeToMinutes(): void
    {
        $this->assertSame(0, $this->service->timeToMinutes(''));
        $this->assertSame(0, $this->service->timeToMinutes('00:00'));
        $this->assertSame(60, $this->service->timeToMinutes('01:00'));
        $this->assertSame(150, $this->service->timeToMinutes('02:30'));
        $this->assertSame(75, $this->service->timeToMinutes('01:15'));
        // Negative balances
        $this->assertSame(-60, $this->service->timeToMinutes('-01:00'));
        $this->assertSame(-135, $this->service->timeToMinutes('-02:15'));
        // With comma format as seen in some point balance representations (e.g. 02,30)
        $this->assertSame(150, $this->service->timeToMinutes('02,30'));
        $this->assertSame(-150, $this->service->timeToMinutes('-02,30'));
    }

    public function testMinutesToTime(): void
    {
        $this->assertSame('00:00', $this->service->minutesToTime(0));
        $this->assertSame('01:00', $this->service->minutesToTime(60));
        $this->assertSame('02:30', $this->service->minutesToTime(150));
        $this->assertSame('-01:00', $this->service->minutesToTime(-60));
        $this->assertSame('-02:15', $this->service->minutesToTime(-135));
    }

    public function testExtractFirstEntryAndLastExit(): void
    {
        $row1 = [
            'e1' => '08:00',
            's1' => '12:00',
            'e2' => '13:00',
            's2' => '17:00',
            'e3' => '',
            's3' => '',
            'e4' => '',
            's4' => '',
        ];
        $this->assertSame('08:00', $this->service->extractFirstEntry($row1));
        $this->assertSame('17:00', $this->service->extractLastExit($row1));

        $row2 = [
            'e1' => '',
            's1' => '',
            'e2' => '09:15',
            's2' => '18:30',
            'e3' => '19:00',
            's3' => '21:45',
            'e4' => '',
            's4' => '',
        ];
        $this->assertSame('09:15', $this->service->extractFirstEntry($row2));
        $this->assertSame('21:45', $this->service->extractLastExit($row2));

        $rowEmpty = [
            'e1' => '',
            's1' => '',
            'e2' => '',
            's2' => '',
        ];
        $this->assertSame('-', $this->service->extractFirstEntry($rowEmpty));
        $this->assertSame('-', $this->service->extractLastExit($rowEmpty));
    }

    public function testCalculateKpisBancoHoras(): void
    {
        $rows = [
            [
                'nome' => 'Colaborador A',
                'saldo_atual' => '10:00',
                'saldo_atual_min' => 600,
                'he_total' => '05:00',
                'he_total_min' => 300,
                'absent_total' => '01:00',
                'absent_total_min' => 60,
            ],
            [
                'nome' => 'Colaborador B',
                'saldo_atual' => '-03:30',
                'saldo_atual_min' => -210,
                'he_total' => '02:00',
                'he_total_min' => 120,
                'absent_total' => '04:00',
                'absent_total_min' => 240,
            ],
            [
                'nome' => 'Colaborador C',
                'saldo_atual' => '00:00',
                'saldo_atual_min' => 0,
                'he_total' => '00:00',
                'he_total_min' => 0,
                'absent_total' => '00:00',
                'absent_total_min' => 0,
            ],
        ];

        $kpis = $this->service->calculateKpisBancoHoras($rows);

        $this->assertSame(3, $kpis['colaboradores']);
        $this->assertSame('07:00', $kpis['he_total']);
        $this->assertSame('05:00', $kpis['absent_total']);
        $this->assertSame('+10:00', $kpis['banco_positivo_total']);
        $this->assertSame(1, $kpis['colab_banco_positivo']);
        $this->assertSame('-03:30', $kpis['banco_negativo_total']);
        $this->assertSame(1, $kpis['colab_banco_negativo']);
        $this->assertSame('+06:30', $kpis['saldo_liquido_total']);
    }

    public function testAbbreviateDayOfWeek(): void
    {
        $this->assertSame('Seg', $this->service->abbreviateDayOfWeek('segunda-feira'));
        $this->assertSame('Ter', $this->service->abbreviateDayOfWeek('terça'));
        $this->assertSame('Qua', $this->service->abbreviateDayOfWeek('quarta'));
        $this->assertSame('Qui', $this->service->abbreviateDayOfWeek('quinta-feira'));
        $this->assertSame('Sex', $this->service->abbreviateDayOfWeek('sexta'));
        $this->assertSame('Sáb', $this->service->abbreviateDayOfWeek('sábado'));
        $this->assertSame('Dom', $this->service->abbreviateDayOfWeek('domingo'));
        // Fallback from ISO date
        $this->assertSame('Sex', $this->service->abbreviateDayOfWeek('', '2026-11-20'));
        $this->assertSame('Sáb', $this->service->abbreviateDayOfWeek('', '2026-11-21'));
        $this->assertSame('Dom', $this->service->abbreviateDayOfWeek('', '2026-11-22'));
    }
}
