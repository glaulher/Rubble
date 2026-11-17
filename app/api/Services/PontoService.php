<?php

declare(strict_types=1);

namespace App\Api\Services;

use App\Api\Repositories\PontoRepository;

class PontoService
{
    private PontoRepository $repo;

    public function __construct(?PontoRepository $repo = null)
    {
        $this->repo = $repo ?? new PontoRepository();
    }

    public function timeToMinutes(string $time): int
    {
        $time = trim($time);
        if ($time === '' || $time === '0' || strtolower($time) === 'nan' || strtolower($time) === 'none') {
            return 0;
        }

        $negative = false;
        if (str_starts_with($time, '-')) {
            $negative = true;
            $time = substr($time, 1);
        } elseif (str_starts_with($time, '+')) {
            $time = substr($time, 1);
        }

        $time = str_replace(',', ':', $time);
        $parts = explode(':', $time);

        $hours = isset($parts[0]) ? (int) $parts[0] : 0;
        $minutes = isset($parts[1]) ? (int) $parts[1] : 0;

        $total = ($hours * 60) + $minutes;
        return $negative ? -$total : $total;
    }

    public function minutesToTime(int $minutes): string
    {
        $negative = $minutes < 0;
        $abs = abs($minutes);
        $h = intdiv($abs, 60);
        $m = $abs % 60;
        $formatted = sprintf('%02d:%02d', $h, $m);
        return $negative ? '-' . $formatted : $formatted;
    }

    public function extractFirstEntry(array $row): string
    {
        foreach (['e1', 'e2', 'e3', 'e4'] as $col) {
            $val = trim((string) ($row[$col] ?? ''));
            if ($val !== '' && !in_array(strtolower($val), ['nan', 'none', 'nat', '-'], true)) {
                return $val;
            }
        }
        return '-';
    }

    public function extractLastExit(array $row): string
    {
        foreach (['s4', 's3', 's2', 's1'] as $col) {
            $val = trim((string) ($row[$col] ?? ''));
            if ($val !== '' && !in_array(strtolower($val), ['nan', 'none', 'nat', '-'], true)) {
                return $val;
            }
        }
        return '-';
    }

    public function abbreviateDayOfWeek(string $dia, ?string $dataIso = null): string
    {
        $d = mb_strtolower(trim($dia), 'UTF-8');
        if (str_starts_with($d, 'seg')) {
            return 'Seg';
        }
        if (str_starts_with($d, 'ter')) {
            return 'Ter';
        }
        if (str_starts_with($d, 'qua')) {
            return 'Qua';
        }
        if (str_starts_with($d, 'qui')) {
            return 'Qui';
        }
        if (str_starts_with($d, 'sex')) {
            return 'Sex';
        }
        if (str_starts_with($d, 'sáb') || str_starts_with($d, 'sab')) {
            return 'Sáb';
        }
        if (str_starts_with($d, 'dom')) {
            return 'Dom';
        }

        if ($dataIso !== null && $dataIso !== '') {
            $ts = strtotime($dataIso);
            if ($ts !== false) {
                $days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                return $days[(int) date('w', $ts)] ?? '-';
            }
        }

        return '-';
    }

    public function calculateKpisBancoHoras(array $rows): array
    {
        $totalColabs = count($rows);
        $totalHeMin = 0;
        $totalAbsentMin = 0;
        $positivoMin = 0;
        $negativoMin = 0;
        $colabPositivo = 0;
        $colabNegativo = 0;

        foreach ($rows as $r) {
            $heMin = (int) ($r['he_total_min'] ?? $this->timeToMinutes((string) ($r['he_total'] ?? '00:00')));
            $absMin = (int) ($r['absent_total_min'] ?? $this->timeToMinutes((string) ($r['absent_total'] ?? '00:00')));
            $saldoMin = (int) ($r['saldo_atual_min'] ?? $this->timeToMinutes((string) ($r['saldo_atual'] ?? '00:00')));

            $totalHeMin += $heMin;
            $totalAbsentMin += $absMin;

            if ($saldoMin > 0) {
                $positivoMin += $saldoMin;
                $colabPositivo++;
            } elseif ($saldoMin < 0) {
                $negativoMin += abs($saldoMin);
                $colabNegativo++;
            }
        }

        $saldoLiquidoMin = $positivoMin - $negativoMin;

        return [
            'colaboradores' => $totalColabs,
            'he_total' => $this->minutesToTime($totalHeMin),
            'absent_total' => $this->minutesToTime($totalAbsentMin),
            'banco_positivo_total' => '+' . $this->minutesToTime($positivoMin),
            'colab_banco_positivo' => $colabPositivo,
            'banco_negativo_total' => '-' . $this->minutesToTime($negativoMin),
            'colab_banco_negativo' => $colabNegativo,
            'saldo_liquido_total' => ($saldoLiquidoMin >= 0 ? '+' : '-') . $this->minutesToTime(abs($saldoLiquidoMin)),
        ];
    }

    public function calculateKpisHorasExtras(array $rows): array
    {
        $totalHeMin = 0;
        $preenchidasCount = 0;
        $pendentesCount = 0;
        $colabsMap = [];

        foreach ($rows as $r) {
            $heMin = (int) ($r['he_min'] ?? $this->timeToMinutes((string) ($r['he'] ?? '00:00')));
            $totalHeMin += $heMin;

            $colabId = $r['colaborador_id'] ?? $r['nome'] ?? '';
            $colabsMap[$colabId] = true;

            $just = trim((string) ($r['justificativa'] ?? ''));
            if ($just !== '') {
                $preenchidasCount++;
            } else {
                $pendentesCount++;
            }
        }

        return [
            'total_registros' => count($rows),
            'colaboradores_distintos' => count($colabsMap),
            'he_total' => $this->minutesToTime($totalHeMin),
            'justificativas_preenchidas' => $preenchidasCount,
            'justificativas_pendentes' => $pendentesCount,
            'taxa_preenchimento' => count($rows) > 0 ? round(($preenchidasCount / count($rows)) * 100) : 0,
        ];
    }

    public function getBancoHoras(?string $cc = null, ?string $busca = null, ?string $turno = null, ?string $orderSaldo = null): array
    {
        $rows = $this->repo->listBancoHoras($cc, $busca, $turno, $orderSaldo);
        $kpis = $this->calculateKpisBancoHoras($rows);

        // Format times for display
        $formatted = array_map(function ($r) {
            $r['he_total'] = $this->minutesToTime((int) ($r['he_total_min'] ?? 0));
            $r['absent_total'] = $this->minutesToTime((int) ($r['absent_total_min'] ?? 0));
            $saldoMin = (int) ($r['saldo_atual_min'] ?? 0);
            $r['saldo_formatado'] = ($saldoMin > 0 ? '+' : '') . $this->minutesToTime($saldoMin);
            return $r;
        }, $rows);

        return [
            'kpis' => $kpis,
            'dados' => $formatted,
        ];
    }

    public function getExtrato(int $colaboradorId, ?string $dataInicio = null, ?string $dataFim = null): array
    {
        $rows = $this->repo->getExtratoColaborador($colaboradorId, $dataInicio, $dataFim);
        $totalHeMin = 0;
        $totalAbsentMin = 0;

        $formatted = array_map(function ($r) use (&$totalHeMin, &$totalAbsentMin) {
            $heMin = (int) ($r['he_min'] ?? 0);
            $absMin = (int) ($r['absent_min'] ?? 0);
            $totalHeMin += $heMin;
            $totalAbsentMin += $absMin;

            $r['dia_abreviado'] = $this->abbreviateDayOfWeek((string) ($r['dia_semana'] ?? ''), (string) ($r['data'] ?? ''));
            $r['primeira_entrada'] = $this->extractFirstEntry($r);
            $r['ultima_saida'] = $this->extractLastExit($r);
            $r['he_formatado'] = $this->minutesToTime($heMin);
            $r['absent_formatado'] = $this->minutesToTime($absMin);
            return $r;
        }, $rows);

        return [
            'colaborador' => !empty($rows) ? [
                'id' => $rows[0]['colaborador_id'],
                'nome' => $rows[0]['nome'],
                'matricula' => $rows[0]['matricula'],
                'cc' => $rows[0]['cc'],
                'funcao' => $rows[0]['funcao'],
                'turno' => $rows[0]['turno'],
            ] : null,
            'resumo' => [
                'total_dias' => count($rows),
                'he_total' => $this->minutesToTime($totalHeMin),
                'absent_total' => $this->minutesToTime($totalAbsentMin),
            ],
            'dados' => $formatted,
        ];
    }

    public function getHorasExtrasSimplificadas(
        ?string $dataInicio = null,
        ?string $dataFim = null,
        ?string $cc = null,
        ?int $colaboradorId = null,
        ?string $busca = null,
        ?string $statusJustificativa = null
    ): array {
        $rows = $this->repo->listHorasExtrasSimplificadas(
            $dataInicio,
            $dataFim,
            $cc,
            $colaboradorId,
            $busca,
            $statusJustificativa
        );

        $kpis = $this->calculateKpisHorasExtras($rows);

        $formatted = array_map(function ($r) {
            $r['dia_abreviado'] = $this->abbreviateDayOfWeek((string) ($r['dia_semana'] ?? ''), (string) ($r['data'] ?? ''));
            $r['primeira_entrada'] = $this->extractFirstEntry($r);
            $r['ultima_saida'] = $this->extractLastExit($r);
            $r['he_formatado'] = $this->minutesToTime((int) ($r['he_min'] ?? 0));
            $r['data_formatada'] = date('d/m/Y', strtotime((string) $r['data']));
            return $r;
        }, $rows);

        return [
            'kpis' => $kpis,
            'dados' => $formatted,
        ];
    }

    public function saveAnotacaoHe(
        int $colaboradorId,
        string $data,
        ?string $gestor,
        ?string $adm,
        string $sobreaviso,
        ?string $justificativa,
        ?string $user
    ): array {
        if ($colaboradorId <= 0) {
            throw new \InvalidArgumentException('ID do colaborador é inválido.');
        }
        if (trim($data) === '') {
            throw new \InvalidArgumentException('Data de referência é obrigatória.');
        }

        $sobreavisoNormalizado = in_array($sobreaviso, ['Sim', 'Não'], true) ? $sobreaviso : '';

        $this->repo->upsertAnotacaoHe(
            $colaboradorId,
            $data,
            $gestor !== null ? trim($gestor) : null,
            $adm !== null ? trim($adm) : null,
            $sobreavisoNormalizado,
            $justificativa !== null ? trim($justificativa) : null,
            $user
        );

        return ['success' => true, 'message' => 'Anotação de Hora Extra salva com sucesso.'];
    }

    public function saveAnotacaoBh(
        int $colaboradorId,
        ?string $gestor,
        ?string $adm,
        ?string $observacao
    ): array {
        if ($colaboradorId <= 0) {
            throw new \InvalidArgumentException('ID do colaborador é inválido.');
        }

        $this->repo->upsertAnotacaoBh(
            $colaboradorId,
            $gestor !== null ? trim($gestor) : null,
            $adm !== null ? trim($adm) : null,
            $observacao !== null ? trim($observacao) : null
        );

        return ['success' => true, 'message' => 'Anotação de Banco de Horas salva com sucesso.'];
    }

    public function getFilterOptions(): array
    {
        return [
            'centros_de_custo' => $this->repo->listCentrosDeCusto(),
            'colaboradores' => $this->repo->listColaboradoresOptions(),
        ];
    }

    public function importExtractedData(array $extractedData, int $uploadId): array
    {
        $this->repo->beginTransaction();
        try {
            $colaboradoresCount = 0;
            $registrosCount = 0;

            foreach ($extractedData as $item) {
                $cabecalho = $item['cabecalho'] ?? [];
                $matricula = trim((string) ($cabecalho['matricula'] ?? ''));
                $nome = trim((string) ($cabecalho['nome'] ?? ''));

                if ($matricula === '' || $nome === '') {
                    continue;
                }

                $colabId = $this->repo->upsertColaborador([
                    'matricula' => $matricula,
                    'nome' => $nome,
                    'cc' => $cabecalho['cc'] ?? null,
                    'funcao' => $cabecalho['funcao'] ?? null,
                    'turno' => $cabecalho['turno'] ?? null,
                ]);

                if ($colabId > 0) {
                    $colaboradoresCount++;
                }

                // Process daily point records
                $registros = $item['registros'] ?? [];
                foreach ($registros as $reg) {
                    $dataStr = trim((string) ($reg['data'] ?? ''));
                    if ($dataStr === '') {
                        continue;
                    }

                    // Convert dd/mm/aaaa to YYYY-MM-DD if needed
                    if (str_contains($dataStr, '/')) {
                        $parts = explode('/', $dataStr);
                        if (count($parts) === 3) {
                            $dataIso = sprintf('%04d-%02d-%02d', (int) $parts[2], (int) $parts[1], (int) $parts[0]);
                        } else {
                            continue;
                        }
                    } else {
                        $dataIso = $dataStr;
                    }

                    $he = trim((string) ($reg['he'] ?? ''));
                    $abs = trim((string) ($reg['absent'] ?? ''));

                    $this->repo->upsertRegistro([
                        'colaborador_id' => $colabId,
                        'data' => $dataIso,
                        'dia_semana' => $reg['dia'] ?? null,
                        'e1' => $reg['e1'] ?? null,
                        's1' => $reg['s1'] ?? null,
                        'e2' => $reg['e2'] ?? null,
                        's2' => $reg['s2'] ?? null,
                        'e3' => $reg['e3'] ?? null,
                        's3' => $reg['s3'] ?? null,
                        'e4' => $reg['e4'] ?? null,
                        's4' => $reg['s4'] ?? null,
                        'he' => $he ?: null,
                        'he_min' => $this->timeToMinutes($he),
                        'absent' => $abs ?: null,
                        'absent_min' => $this->timeToMinutes($abs),
                        'jornada' => $reg['jornada'] ?? null,
                        'adnot' => $reg['adnot'] ?? null,
                        'observacao' => $reg['observacao'] ?? null,
                        'status' => $reg['status'] ?? 'OK',
                        'upload_id' => $uploadId,
                    ]);
                    $registrosCount++;
                }

                // Process banco de horas summary if present
                $bh = $item['banco_horas'] ?? null;
                if ($bh && is_array($bh)) {
                    $saldoAtual = trim((string) ($bh['saldo_atual'] ?? ''));
                    $saldoMin = $this->timeToMinutes($saldoAtual);

                    $this->repo->upsertBancoHoras([
                        'colaborador_id' => $colabId,
                        'ciclo_inicio' => $bh['ciclo_inicio'] ?? '1970-01-01',
                        'ciclo_fim' => $bh['ciclo_fim'] ?? null,
                        'saldo_anterior' => $bh['saldo_anterior'] ?? null,
                        'debito' => $bh['debito'] ?? null,
                        'credito' => $bh['credito'] ?? null,
                        'saldo_atual' => $saldoAtual ?: '00:00',
                        'saldo_atual_min' => $saldoMin,
                        'dias_com_he' => (int) ($bh['dias_com_he'] ?? 0),
                        'dias_com_ausencia' => (int) ($bh['dias_com_ausencia'] ?? 0),
                    ]);
                }
            }

            $this->repo->updateUpload($uploadId, $colaboradoresCount, $registrosCount, 'CONCLUIDO');
            $this->repo->commit();

            return [
                'success' => true,
                'total_colaboradores' => $colaboradoresCount,
                'total_registros' => $registrosCount,
            ];
        } catch (\Throwable $e) {
            $this->repo->rollback();
            $this->repo->updateUpload($uploadId, 0, 0, 'ERRO');
            throw $e;
        }
    }
}
