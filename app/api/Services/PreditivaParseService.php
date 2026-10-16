<?php

namespace App\Api\Services;

class PreditivaParseService
{
    private string $defaultTemplatePath;
    private string $pythonScriptPath;

    public function __construct()
    {
        $baseDir = dirname(__DIR__, 2);
        $this->defaultTemplatePath = $baseDir . '/storage/templates/Preditiva_parse.xlsx';
        if (!file_exists($this->defaultTemplatePath)) {
            $this->defaultTemplatePath = $baseDir . '/Preditiva_parse.xlsx';
        }
        $this->pythonScriptPath = __DIR__ . '/preditiva_parser.py';
    }

    /**
     * Processa o arquivo CLIMA e gera o template preenchido
     *
     * @param string $climaPath Caminho do arquivo CLIMA enviado
     * @param string|null $templatePath Caminho do template opcional
     * @return array
     */
    public function process(string $climaPath, ?string $templatePath = null): array
    {
        if (!file_exists($climaPath) || !is_readable($climaPath)) {
            return [
                'success' => false,
                'message' => 'Arquivo CLIMA não encontrado ou inacessível: ' . $climaPath
            ];
        }

        $templateToUse = $templatePath && file_exists($templatePath) ? $templatePath : $this->defaultTemplatePath;

        if (!file_exists($templateToUse)) {
            return [
                'success' => false,
                'message' => 'Template de preditiva não encontrado no servidor.'
            ];
        }

        $tempOutputDir = sys_get_temp_dir() . '/rubble_preditiva';
        if (!is_dir($tempOutputDir)) {
            @mkdir($tempOutputDir, 0777, true);
        }

        $outputPath = $tempOutputDir . '/Preditiva_preenchida_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.xlsx';

        // Escapar argumentos para shell
        $cmd = sprintf(
            'python3 %s --clima %s --template %s --output %s 2>&1',
            escapeshellarg($this->pythonScriptPath),
            escapeshellarg($climaPath),
            escapeshellarg($templateToUse),
            escapeshellarg($outputPath)
        );

        $outputLines = [];
        $returnCode = 0;
        exec($cmd, $outputLines, $returnCode);

        $outputStr = trim(implode("\n", $outputLines));

        if ($returnCode !== 0 || !file_exists($outputPath)) {
            return [
                'success' => false,
                'message' => 'Erro ao processar planilha: ' . ($outputStr ?: 'Falha na execução do parser Python')
            ];
        }

        $stats = null;
        for ($i = count($outputLines) - 1; $i >= 0; $i--) {
            $line = trim($outputLines[$i]);
            if (str_starts_with($line, '{') && str_ends_with($line, '}')) {
                $decoded = json_decode($line, true);
                if (is_array($decoded) && isset($decoded['success'])) {
                    $stats = $decoded;
                    break;
                }
            }
        }

        if (!is_array($stats)) {
            $stats = [
                'success' => true,
                'total_rows' => 0,
                'matched_rows' => 0,
                'unmatched_rows' => 0,
            ];
        }

        return [
            'success' => true,
            'output_path' => $outputPath,
            'stats' => $stats,
            'message' => 'Planilha processada com sucesso'
        ];
    }
}
