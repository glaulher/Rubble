<?php

namespace App\Api\Services;

class PreditivaParseService
{
    private string $defaultTemplatePath;
    private string $pythonScriptPath;

    public function __construct()
    {
        $candidates = [
            dirname(__DIR__, 3) . '/storage/templates/Preditiva_parse.xlsx',
            dirname(__DIR__, 3) . '/Preditiva_parse.xlsx',
            __DIR__ . '/templates/Preditiva_parse.xlsx',
            dirname(__DIR__, 2) . '/storage/templates/Preditiva_parse.xlsx',
            '/var/www/html/storage/templates/Preditiva_parse.xlsx',
            '/var/www/html/Preditiva_parse.xlsx',
        ];

        $this->defaultTemplatePath = '';
        foreach ($candidates as $candidate) {
            if (file_exists($candidate) && is_readable($candidate)) {
                $this->defaultTemplatePath = $candidate;
                break;
            }
        }

        if (empty($this->defaultTemplatePath)) {
            $this->defaultTemplatePath = dirname(__DIR__, 3) . '/storage/templates/Preditiva_parse.xlsx';
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

        // Garante que o arquivo CLIMA temporário tenha extensão .xlsx para evitar rejeição de openpyxl
        $climaToUse = $climaPath;
        $tempClimaCopy = null;
        if (!str_ends_with(strtolower($climaPath), '.xlsx')) {
            $tempClimaCopy = $tempOutputDir . '/clima_tmp_' . uniqid() . '.xlsx';
            if (@copy($climaPath, $tempClimaCopy)) {
                $climaToUse = $tempClimaCopy;
            }
        }

        // Garante extensão .xlsx para template se tiver vindo de upload
        $templateArg = $templateToUse;
        $tempTemplateCopy = null;
        if (!str_ends_with(strtolower($templateToUse), '.xlsx')) {
            $tempTemplateCopy = $tempOutputDir . '/template_tmp_' . uniqid() . '.xlsx';
            if (@copy($templateToUse, $tempTemplateCopy)) {
                $templateArg = $tempTemplateCopy;
            }
        }

        $outputPath = $tempOutputDir . '/Preditiva_preenchida_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.xlsx';

        // Escapar argumentos para shell
        $cmd = sprintf(
            'python3 %s --clima %s --template %s --output %s 2>&1',
            escapeshellarg($this->pythonScriptPath),
            escapeshellarg($climaToUse),
            escapeshellarg($templateArg),
            escapeshellarg($outputPath)
        );

        $outputLines = [];
        $returnCode = 0;
        exec($cmd, $outputLines, $returnCode);

        // Limpa cópias temporárias criadas
        if ($tempClimaCopy && file_exists($tempClimaCopy)) {
            @unlink($tempClimaCopy);
        }
        if ($tempTemplateCopy && file_exists($tempTemplateCopy)) {
            @unlink($tempTemplateCopy);
        }

        $outputStr = trim(implode("\n", $outputLines));

        if ($returnCode !== 0 || !file_exists($outputPath)) {
            error_log('PreditivaParse stderr/stdout: ' . $outputStr);
            return [
                'success' => false,
                'message' => 'Erro ao processar planilha: ' . self::sanitizeParserError($outputStr)
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

    /**
     * Converte a saida crua do parser (stdout+stderr com 2>&1) em uma
     * mensagem segura para o cliente. O log completo vai para error_log.
     * Prioriza o JSON de erro controlado do preditiva_parser.py; sem JSON,
     * retorna mensagem generica (nunca traceback nem paths absolutos).
     */
    public static function sanitizeParserError(string $rawOutput): string
    {
        $message = null;

        $lines = array_reverse(explode("\n", $rawOutput));
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || !str_starts_with($line, '{') || !str_ends_with($line, '}')) {
                continue;
            }
            $decoded = json_decode($line, true);
            if (is_array($decoded) && ($decoded['success'] ?? true) === false && isset($decoded['error'])) {
                $message = (string) $decoded['error'];
                break;
            }
        }

        if ($message === null || trim($message) === '') {
            return 'Falha na execução do parser Python';
        }

        // Remove controle/ANSI, colapsa whitespace.
        $message = preg_replace('/[\x00-\x1F\x7F]/', ' ', $message);
        $message = preg_replace('/\s+/', ' ', $message);
        $message = trim($message);

        // Paths absolutos viram apenas o basename (mantém o nome do arquivo
        // para o usuário reconhecer o problema, sem vender a estrutura do servidor).
        $message = preg_replace_callback(
            '#(?:[A-Za-z]:)?(?:/[\w.\-]+){2,}#',
            static fn(array $m): string => basename($m[0]),
            $message
        );

        if (strlen($message) > 300) {
            $message = substr($message, 0, 300) . '…';
        }

        return $message !== '' ? $message : 'Falha na execução do parser Python';
    }
}
