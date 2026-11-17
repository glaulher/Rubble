<?php

declare(strict_types=1);

/**
 * Script CLI: Migração de dados do Tempo Fechado para o MariaDB do Rubble
 * Uso: php app/api/Cron/migrate_tempo_fechado_to_mariadb.php [--excel <caminho>] [--anotacoes <caminho>]
 */

require_once __DIR__ . '/../../../config/Env.php';
\App\Config\Env::load(__DIR__ . '/../../../.env');

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Api\Services\PontoService;
use App\Api\Repositories\PontoRepository;

$options = getopt('', ['excel:', 'anotacoes:']);
$excelPath = $options['excel'] ?? __DIR__ . '/../../../tempo_fechado/data/resultado_lote_consultas_validado.xlsx';
$anotacoesPath = $options['anotacoes'] ?? __DIR__ . '/../../../tempo_fechado/data/anotacoes_operacionais.json';

echo "=== Migração Tempo Fechado -> MariaDB Rubble ===\n";
echo "Excel: {$excelPath}\n";
echo "Anotações: {$anotacoesPath}\n";

$repo = new PontoRepository();
$service = new PontoService($repo);

// 1. Migração de Anotações Operacionais (Justificativas, Gestor, Adm, Sobreaviso)
if (file_exists($anotacoesPath)) {
    echo "\nLendo anotações operacionais em: {$anotacoesPath}...\n";
    $jsonContent = file_get_contents($anotacoesPath);
    $anotacoes = json_decode($jsonContent, true);

    if (is_array($anotacoes)) {
        $countAnotacoes = 0;
        foreach ($anotacoes as $chave => $item) {
            if (!is_array($item)) {
                continue;
            }
            // Chave padrão: guia|cc|nome|data|dia
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

            // Garante colaborador cadastrado
            $matriculaGerada = 'TF_' . substr(md5($nome), 0, 8);
            $colabId = $repo->upsertColaborador([
                'matricula' => $matriculaGerada,
                'nome' => $nome,
                'cc' => $cc ?: null,
            ]);

            // Se a anotação for de H.E.
            if ($guia === 'horas_extras_simplificadas' && $dataStr !== '') {
                // Converte dd/mm/aaaa para YYYY-MM-DD
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
                $countAnotacoes++;
            } elseif ($guia === 'banco_horas') {
                $gestor = $item['nome_gestor'] ?? null;
                $adm = $item['adm_responsavel'] ?? null;
                $obs = $item['observacao'] ?? null;
                $repo->upsertAnotacaoBh($colabId, $gestor, $adm, $obs);
                $countAnotacoes++;
            }
        }
        echo "Anotações migradas: {$countAnotacoes}\n";
    }
} else {
    echo "Arquivo de anotações não encontrado (ignorado se ainda não houver dados preenchidos).\n";
}

echo "\nMigração concluída com sucesso no MariaDB!\n";
