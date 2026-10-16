<?php

namespace App\Api\Controllers;

use App\Api\Services\PreditivaParseService;
use App\Api\Helpers\Response;

class PreditivaParseController
{
    private PreditivaParseService $service;

    public function __construct()
    {
        $this->service = new PreditivaParseService();
    }

    /**
     * Processa a planilha CLIMA e devolve o XLSX preenchido
     */
    public function parse(): void
    {
        try {
            if (!isset($_FILES['clima_file']) || $_FILES['clima_file']['error'] !== UPLOAD_ERR_OK) {
                Response::error('Nenhum arquivo CLIMA enviado ou ocorreu um erro no upload.', 400);
                return;
            }

            $climaFile = $_FILES['clima_file'];
            $climaExt = strtolower(pathinfo($climaFile['name'], PATHINFO_EXTENSION));
            if ($climaExt !== 'xlsx') {
                Response::error('O arquivo CLIMA deve estar no formato .xlsx.', 400);
                return;
            }

            $templatePath = null;
            if (isset($_FILES['template_file']) && $_FILES['template_file']['error'] === UPLOAD_ERR_OK) {
                $tmplExt = strtolower(pathinfo($_FILES['template_file']['name'], PATHINFO_EXTENSION));
                if ($tmplExt !== 'xlsx') {
                    Response::error('O arquivo de template deve estar no formato .xlsx.', 400);
                    return;
                }
                $templatePath = $_FILES['template_file']['tmp_name'];
            }

            $result = $this->service->process($climaFile['tmp_name'], $templatePath);

            if (!$result['success']) {
                Response::error($result['message'] ?? 'Falha ao processar planilha.', 400);
                return;
            }

            $outputPath = $result['output_path'];
            $stats = $result['stats'] ?? [];

            if (!file_exists($outputPath)) {
                Response::error('Arquivo de saída não foi gerado.', 500);
                return;
            }

            $downloadName = 'Preditiva_preenchida_' . date('Y-m-d') . '.xlsx';

            // Headers para download do arquivo XLSX com estatísticas
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $downloadName . '"');
            header('Content-Length: ' . filesize($outputPath));
            header('X-Parse-Stats: ' . json_encode($stats, JSON_UNESCAPED_UNICODE));
            header('Access-Control-Expose-Headers: Content-Disposition, X-Parse-Stats');
            header('Cache-Control: no-cache, no-store, must-revalidate');

            // Limpa buffers e faz stream
            if (ob_get_level()) {
                ob_end_clean();
            }

            readfile($outputPath);

            // Remove o temporário gerado
            @unlink($outputPath);
            exit;
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
