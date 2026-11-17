<?php

declare(strict_types=1);

/**
 * Script CLI: Migração completa de dados do Tempo Fechado para o MariaDB do Rubble
 * Uso:
 *   php app/api/Cron/migrate_tempo_fechado_to_mariadb.php
 *   php app/api/Cron/migrate_tempo_fechado_to_mariadb.php --data-dir=/caminho/para/data
 *   php app/api/Cron/migrate_tempo_fechado_to_mariadb.php --excel=/caminho/excel.xlsx --resumo=/caminho/resumo.json --anotacoes=/caminho/anotacoes.json
 */

$startTime = microtime(true);

require_once __DIR__ . '/../../../config/Env.php';
\App\Config\Env::load(__DIR__ . '/../../../.env');

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Api\Services\PontoService;
use App\Api\Repositories\PontoRepository;

$options = getopt('', ['data-dir:', 'excel:', 'resumo:', 'anotacoes:']);

// Resolução do diretório de dados
$candidatosDataDir = [
    $options['data-dir'] ?? null,
    '/var/www/html/tempo_fechado/data',
    __DIR__ . '/../../../tempo_fechado/data',
    '/tempo_data',
    '/app/data',
];

$dataDir = null;
foreach ($candidatosDataDir as $candidato) {
    if ($candidato && is_dir($candidato)) {
        $dataDir = rtrim($candidato, '/');
        break;
    }
}
if (!$dataDir) {
    $dataDir = __DIR__ . '/../../../tempo_fechado/data';
}

$excelPath = $options['excel'] ?? ($dataDir . '/resultado_lote_consultas_validado.xlsx');
$resumoPath = $options['resumo'] ?? ($dataDir . '/resumo_banco_horas_pdf.json');
$anotacoesPath = $options['anotacoes'] ?? ($dataDir . '/anotacoes_operacionais.json');

echo "======================================================\n";
echo " MIGRAÇÃO DE DADOS: TEMPO FECHADO -> MARIADB (RUBBLE) \n";
echo "======================================================\n";
echo "Diretório de dados: {$dataDir}\n";
echo "1. Resumo Banco de Horas : {$resumoPath} " . (file_exists($resumoPath) ? "[ENCONTRADO]" : "[NÃO ENCONTRADO]") . "\n";
echo "2. Planilha Consolidada  : {$excelPath} " . (file_exists($excelPath) ? "[ENCONTRADO]" : "[NÃO ENCONTRADO]") . "\n";
echo "3. Anotações Operacionais: {$anotacoesPath} " . (file_exists($anotacoesPath) ? "[ENCONTRADO]" : "[NÃO ENCONTRADO]") . "\n\n";

$repo = new PontoRepository();
$service = new PontoService($repo);

$totais = [
    'colaboradores' => 0,
    'banco_horas' => 0,
    'registros_diarios' => 0,
    'anotacoes_he' => 0,
    'anotacoes_bh' => 0,
];

// -----------------------------------------------------------------
// FASE 1: Resumo do Banco de Horas (resumo_banco_horas_pdf.json)
// -----------------------------------------------------------------
if (file_exists($resumoPath)) {
    echo "[FASE 1/3] Processando resumo do Banco de Horas...\n";
    $rawResumo = file_get_contents($resumoPath);
    $jsonResumo = json_decode($rawResumo, true);

    if (is_array($jsonResumo) && !empty($jsonResumo['linhas'])) {
        $linhas = $jsonResumo['linhas'];
        $countBh = 0;
        $countColab = 0;

        $repo->beginTransaction();
        try {
            foreach ($linhas as $l) {
                $nome = trim((string) ($l['nome'] ?? ''));
                if ($nome === '') {
                    continue;
                }
                $matricula = trim((string) ($l['matricula'] ?? ''));
                if ($matricula === '') {
                    $matricula = 'TF_' . substr(md5($nome), 0, 8);
                }

                $colabId = $repo->upsertColaborador([
                    'matricula' => $matricula,
                    'nome' => $nome,
                    'cc' => $l['cc'] ?? null,
                    'funcao' => $l['funcao'] ?? null,
                    'turno' => $l['turno'] ?? null,
                ]);

                if ($colabId > 0) {
                    $countColab++;
                    $saldoAtual = trim((string) ($l['saldo_atual'] ?? '00:00'));
                    $saldoMin = $service->timeToMinutes($saldoAtual);

                    $repo->upsertBancoHoras([
                        'colaborador_id' => $colabId,
                        'ciclo_inicio' => '1970-01-01',
                        'ciclo_fim' => null,
                        'saldo_anterior' => $l['saldo_anterior'] ?? null,
                        'debito' => $l['absent_total'] ?? $l['debito'] ?? null,
                        'credito' => $l['he_total'] ?? $l['credito'] ?? null,
                        'saldo_atual' => $saldoAtual,
                        'saldo_atual_min' => $saldoMin,
                        'dias_com_he' => (int) ($l['dias_com_he'] ?? 0),
                        'dias_com_ausencia' => (int) ($l['dias_com_ausencia'] ?? 0),
                    ]);
                    $countBh++;
                }
            }
            $repo->commit();
            $totais['colaboradores'] += $countColab;
            $totais['banco_horas'] += $countBh;
            echo "  ✓ {$countColab} colaborador(es) cadastrados e {$countBh} saldo(s) de Banco de Horas importados.\n";
        } catch (\Throwable $e) {
            $repo->rollback();
            echo "  ✗ Erro na FASE 1: {$e->getMessage()}\n";
        }
    } else {
        echo "  ! Arquivo de resumo está vazio ou sem linhas reconhecíveis.\n";
    }
} else {
    echo "[FASE 1/3] Pulando resumo do Banco de Horas (arquivo não encontrado).\n";
}

// -----------------------------------------------------------------
// FASE 2: Planilha Consolidada (resultado_lote_consultas_validado.xlsx)
// -----------------------------------------------------------------
if (file_exists($excelPath)) {
    echo "\n[FASE 2/3] Extraindo registros diários da planilha Excel...\n";
    $tempJson = sys_get_temp_dir() . '/rubble_excel_extracted_' . uniqid() . '.json';
    $pythonScript = __DIR__ . '/../Python/ponto_excel_extractor.py';

    $cmd = sprintf(
        'python3 %s --file %s --output %s 2>&1',
        escapeshellarg($pythonScript),
        escapeshellarg($excelPath),
        escapeshellarg($tempJson)
    );

    $out = [];
    $code = 0;
    exec($cmd, $out, $code);

    if (file_exists($tempJson)) {
        $extractedRaw = file_get_contents($tempJson);
        $extracted = json_decode($extractedRaw, true);
        @unlink($tempJson);

        if (is_array($extracted) && !empty($extracted['ok']) && !empty($extracted['registros'])) {
            $registros = $extracted['registros'];
            $colabsMap = []; // cache nome/matricula -> id

            echo "  Extração concluída com sucesso: " . count($registros) . " registros encontrados.\n";
            echo "  Persistindo no MariaDB em lotes transacionais...\n";

            // 1. Cadastra colaboradores da planilha
            if (!empty($extracted['colaboradores'])) {
                foreach ($extracted['colaboradores'] as $c) {
                    $nome = trim((string) ($c['nome'] ?? ''));
                    if ($nome === '') {
                        continue;
                    }
                    $mat = trim((string) ($c['matricula'] ?? ''));
                    if ($mat === '') {
                        $mat = 'TF_' . substr(md5($nome), 0, 8);
                    }
                    $cId = $repo->upsertColaborador([
                        'matricula' => $mat,
                        'nome' => $nome,
                        'cc' => $c['cc'] ?? null,
                        'funcao' => $c['funcao'] ?? null,
                        'turno' => $c['turno'] ?? null,
                    ]);
                    if ($cId > 0) {
                        $colabsMap[strtolower($nome)] = $cId;
                        if ($mat !== '') {
                            $colabsMap[strtolower($mat)] = $cId;
                        }
                    }
                }
            }

            // 2. Insere batidas diárias em lotes de 500
            $batchSize = 500;
            $batchCount = 0;
            $totalRegs = count($registros);
            $insertedRegs = 0;

            $repo->beginTransaction();
            try {
                foreach ($registros as $reg) {
                    $nome = trim((string) ($reg['nome'] ?? ''));
                    $mat = trim((string) ($reg['matricula'] ?? ''));
                    $dataStr = trim((string) ($reg['data'] ?? ''));

                    if ($nome === '' || $dataStr === '') {
                        continue;
                    }

                    $colabId = $colabsMap[strtolower($mat)] ?? ($colabsMap[strtolower($nome)] ?? null);
                    if (!$colabId) {
                        $found = $repo->findColaboradorByNome($nome);
                        if ($found) {
                            $colabId = (int) $found['id'];
                            $colabsMap[strtolower($nome)] = $colabId;
                        } else {
                            if ($mat === '') {
                                $mat = 'TF_' . substr(md5($nome), 0, 8);
                            }
                            $colabId = $repo->upsertColaborador([
                                'matricula' => $mat,
                                'nome' => $nome,
                                'cc' => $reg['cc'] ?? null,
                                'funcao' => $reg['funcao'] ?? null,
                                'turno' => $reg['turno'] ?? null,
                            ]);
                            $colabsMap[strtolower($nome)] = $colabId;
                        }
                    }

                    // Formatação de data ISO
                    $dataIso = $dataStr;
                    if (str_contains($dataStr, '/')) {
                        $dp = explode('/', $dataStr);
                        if (count($dp) === 3) {
                            $dataIso = sprintf('%04d-%02d-%02d', (int) $dp[2], (int) $dp[1], (int) $dp[0]);
                        }
                    }

                    $he = trim((string) ($reg['he'] ?? ''));
                    $abs = trim((string) ($reg['absent'] ?? ''));

                    $repo->upsertRegistro([
                        'colaborador_id' => $colabId,
                        'data' => $dataIso,
                        'dia_semana' => $reg['dia'] ?? null,
                        'e1' => $reg['e1'] ?: null,
                        's1' => $reg['s1'] ?: null,
                        'e2' => $reg['e2'] ?: null,
                        's2' => $reg['s2'] ?: null,
                        'e3' => $reg['e3'] ?: null,
                        's3' => $reg['s3'] ?: null,
                        'e4' => $reg['e4'] ?: null,
                        's4' => $reg['s4'] ?: null,
                        'he' => $he ?: null,
                        'he_min' => $service->timeToMinutes($he),
                        'absent' => $abs ?: null,
                        'absent_min' => $service->timeToMinutes($abs),
                        'jornada' => $reg['jornada'] ?: null,
                        'adnot' => $reg['adnot'] ?: null,
                        'observacao' => $reg['observacao'] ?: null,
                        'status' => $reg['status'] ?: 'OK',
                    ]);

                    $insertedRegs++;
                    $batchCount++;

                    if ($batchCount >= $batchSize) {
                        $repo->commit();
                        $repo->beginTransaction();
                        $batchCount = 0;
                        echo "  → {$insertedRegs} / {$totalRegs} batidas salvas...\n";
                    }
                }
                $repo->commit();
                $totais['registros_diarios'] += $insertedRegs;
                echo "  ✓ {$insertedRegs} registros de ponto diários importados no MariaDB.\n";
            } catch (\Throwable $e) {
                $repo->rollback();
                echo "  ✗ Erro na inserção de registros: {$e->getMessage()}\n";
            }
        } else {
            $msgErro = $extracted['erro'] ?? 'Formato retornado inválido.';
            echo "  ✗ Falha na extração do Excel: {$msgErro}\n";
            if (!empty($out)) {
                echo "    Detalhes: " . implode("\n    ", $out) . "\n";
            }
        }
    } else {
        echo "  ✗ Falha ao executar script de extração Python.\n";
        if (!empty($out)) {
            echo "    " . implode("\n    ", $out) . "\n";
        }
    }
} else {
    echo "\n[FASE 2/3] Pulando planilha Excel (arquivo não encontrado).\n";
}

// -----------------------------------------------------------------
// FASE 3: Anotações Operacionais (anotacoes_operacionais.json)
// -----------------------------------------------------------------
if (file_exists($anotacoesPath)) {
    echo "\n[FASE 3/3] Processando anotações operacionais e justificativas...\n";
    $jsonContent = file_get_contents($anotacoesPath);
    $anotacoes = json_decode($jsonContent, true);

    if (is_array($anotacoes)) {
        $countHe = 0;
        $countBh = 0;

        $repo->beginTransaction();
        try {
            foreach ($anotacoes as $chave => $item) {
                if (!is_array($item)) {
                    continue;
                }
                $partes = explode('|', $chave);
                if (count($partes) < 4) {
                    continue;
                }
                $guia = $partes[0];
                $cc = $partes[1];
                $nome = $partes[2];
                $dataStr = $partes[3];

                if ($nome === '') {
                    continue;
                }

                // Tenta achar pelo nome primeiro para vincular ao ID real
                $colab = $repo->findColaboradorByNome($nome);
                if ($colab) {
                    $colabId = (int) $colab['id'];
                } else {
                    $matriculaGerada = 'TF_' . substr(md5($nome), 0, 8);
                    $colabId = $repo->upsertColaborador([
                        'matricula' => $matriculaGerada,
                        'nome' => $nome,
                        'cc' => $cc ?: null,
                    ]);
                }

                if ($guia === 'horas_extras_simplificadas' && $dataStr !== '') {
                    $dataIso = $dataStr;
                    if (str_contains($dataStr, '/')) {
                        $dp = explode('/', $dataStr);
                        if (count($dp) === 3) {
                            $dataIso = sprintf('%04d-%02d-%02d', (int) $dp[2], (int) $dp[1], (int) $dp[0]);
                        }
                    }

                    $sobreaviso = $item['sobreaviso'] ?? '';
                    $gestor = $item['nome_gestor'] ?? null;
                    $adm = $item['adm_responsavel'] ?? null;
                    $justificativa = $item['observacao'] ?? $item['justificativa'] ?? null;

                    $repo->upsertAnotacaoHe(
                        $colabId,
                        $dataIso,
                        $gestor,
                        $adm,
                        $sobreaviso === 'Sim' ? 'Sim' : ($sobreaviso === 'Não' || $sobreaviso === 'Nao' ? 'Não' : ''),
                        $justificativa,
                        'migracao_tempo_fechado'
                    );
                    $countHe++;
                } elseif ($guia === 'banco_horas') {
                    $gestor = $item['nome_gestor'] ?? null;
                    $adm = $item['adm_responsavel'] ?? null;
                    $obs = $item['observacao'] ?? null;
                    $repo->upsertAnotacaoBh($colabId, $gestor, $adm, $obs);
                    $countBh++;
                }
            }
            $repo->commit();
            $totais['anotacoes_he'] += $countHe;
            $totais['anotacoes_bh'] += $countBh;
            echo "  ✓ {$countHe} anotação(ões) de Hora Extra vinculadas.\n";
            echo "  ✓ {$countBh} anotação(ões) de Banco de Horas vinculadas.\n";
        } catch (\Throwable $e) {
            $repo->rollback();
            echo "  ✗ Erro na FASE 3: {$e->getMessage()}\n";
        }
    } else {
        echo "  ! Arquivo de anotações não contém dados válidos.\n";
    }
} else {
    echo "\n[FASE 3/3] Pulando anotações operacionais (arquivo não encontrado).\n";
}

$elapsed = round(microtime(true) - $startTime, 2);

echo "\n======================================================\n";
echo " RESUMO DA MIGRAÇÃO (Tempo: {$elapsed}s)\n";
echo "======================================================\n";
echo "• Colaboradores cadastrados/atualizados : {$totais['colaboradores']}\n";
echo "• Registros de ponto diários inseridos : {$totais['registros_diarios']}\n";
echo "• Saldos de Banco de Horas importados   : {$totais['banco_horas']}\n";
echo "• Anotações de Hora Extra vinculadas    : {$totais['anotacoes_he']}\n";
echo "• Anotações de Banco de Horas vinculadas: {$totais['anotacoes_bh']}\n";
echo "======================================================\n";
echo "Migração concluída com sucesso no MariaDB!\n";
