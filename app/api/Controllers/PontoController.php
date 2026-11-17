<?php

declare(strict_types=1);

namespace App\Api\Controllers;

use App\Api\Helpers\Request;
use App\Api\Helpers\Response;
use App\Api\Services\PontoService;

class PontoController
{
    private PontoService $service;

    public function __construct(?PontoService $service = null)
    {
        $this->service = $service ?? new PontoService();
    }

    public function getBancoHoras(): void
    {
        try {
            $cc = isset($_GET['cc']) && trim((string) $_GET['cc']) !== '' ? trim((string) $_GET['cc']) : null;
            $busca = isset($_GET['busca']) && trim((string) $_GET['busca']) !== '' ? trim((string) $_GET['busca']) : null;
            $turno = isset($_GET['turno']) && trim((string) $_GET['turno']) !== '' ? trim((string) $_GET['turno']) : null;
            $orderSaldo = isset($_GET['order_saldo']) && trim((string) $_GET['order_saldo']) !== '' ? trim((string) $_GET['order_saldo']) : null;

            $result = $this->service->getBancoHoras($cc, $busca, $turno, $orderSaldo);
            Response::json($result);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function getExtrato(): void
    {
        try {
            $colaboradorId = isset($_GET['colaborador_id']) ? (int) $_GET['colaborador_id'] : 0;
            if ($colaboradorId <= 0) {
                Response::error('ID do colaborador é obrigatório.', 400);
                return;
            }

            $dataInicio = isset($_GET['data_inicio']) && trim((string) $_GET['data_inicio']) !== '' ? trim((string) $_GET['data_inicio']) : null;
            $dataFim = isset($_GET['data_fim']) && trim((string) $_GET['data_fim']) !== '' ? trim((string) $_GET['data_fim']) : null;

            $result = $this->service->getExtrato($colaboradorId, $dataInicio, $dataFim);
            Response::json($result);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function getHorasExtrasSimplificadas(): void
    {
        try {
            $dataInicio = isset($_GET['data_inicio']) && trim((string) $_GET['data_inicio']) !== '' ? trim((string) $_GET['data_inicio']) : null;
            $dataFim = isset($_GET['data_fim']) && trim((string) $_GET['data_fim']) !== '' ? trim((string) $_GET['data_fim']) : null;
            $cc = isset($_GET['cc']) && trim((string) $_GET['cc']) !== '' ? trim((string) $_GET['cc']) : null;
            $colaboradorId = isset($_GET['colaborador_id']) && (int) $_GET['colaborador_id'] > 0 ? (int) $_GET['colaborador_id'] : null;
            $busca = isset($_GET['busca']) && trim((string) $_GET['busca']) !== '' ? trim((string) $_GET['busca']) : null;
            $statusJustificativa = isset($_GET['status_justificativa']) && trim((string) $_GET['status_justificativa']) !== '' ? trim((string) $_GET['status_justificativa']) : null;

            $result = $this->service->getHorasExtrasSimplificadas(
                $dataInicio,
                $dataFim,
                $cc,
                $colaboradorId,
                $busca,
                $statusJustificativa
            );
            Response::json($result);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function saveAnotacaoHe(): void
    {
        try {
            $body = Request::body();
            $colaboradorId = isset($body['colaborador_id']) ? (int) $body['colaborador_id'] : 0;
            $data = isset($body['data']) ? trim((string) $body['data']) : '';
            $gestor = isset($body['nome_gestor']) ? (string) $body['nome_gestor'] : null;
            $adm = isset($body['adm_responsavel']) ? (string) $body['adm_responsavel'] : null;
            $sobreaviso = isset($body['sobreaviso']) ? (string) $body['sobreaviso'] : '';
            $justificativa = isset($body['justificativa']) ? (string) $body['justificativa'] : null;
            $user = isset($body['user']) ? (string) $body['user'] : null;

            if ($colaboradorId <= 0 || $data === '') {
                Response::error('Parâmetros obrigatórios ausentes (colaborador_id e data).', 400);
                return;
            }

            $res = $this->service->saveAnotacaoHe($colaboradorId, $data, $gestor, $adm, $sobreaviso, $justificativa, $user);
            Response::json($res);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function saveAnotacaoBh(): void
    {
        try {
            $body = Request::body();
            $colaboradorId = isset($body['colaborador_id']) ? (int) $body['colaborador_id'] : 0;
            $gestor = isset($body['nome_gestor']) ? (string) $body['nome_gestor'] : null;
            $adm = isset($body['adm_responsavel']) ? (string) $body['adm_responsavel'] : null;
            $observacao = isset($body['observacao']) ? (string) $body['observacao'] : null;

            if ($colaboradorId <= 0) {
                Response::error('ID do colaborador é obrigatório.', 400);
                return;
            }

            $res = $this->service->saveAnotacaoBh($colaboradorId, $gestor, $adm, $observacao);
            Response::json($res);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function getFilterOptions(): void
    {
        try {
            $options = $this->service->getFilterOptions();
            Response::json($options);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }

    public function uploadPdfs(): void
    {
        try {
            if (empty($_FILES['pdfs'])) {
                Response::error('Nenhum arquivo PDF enviado.', 400);
                return;
            }

            $files = $_FILES['pdfs'];
            $fileList = [];

            if (is_array($files['name'])) {
                $count = count($files['name']);
                for ($i = 0; $i < $count; $i++) {
                    if ($files['error'][$i] === UPLOAD_ERR_OK) {
                        $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
                        if ($ext === 'pdf') {
                            $fileList[] = [
                                'name' => $files['name'][$i],
                                'tmp_name' => $files['tmp_name'][$i],
                            ];
                        }
                    }
                }
            } else {
                if ($files['error'] === UPLOAD_ERR_OK && strtolower(pathinfo($files['name'], PATHINFO_EXTENSION)) === 'pdf') {
                    $fileList[] = [
                        'name' => $files['name'],
                        'tmp_name' => $files['tmp_name'],
                    ];
                }
            }

            if (empty($fileList)) {
                Response::error('Nenhum arquivo PDF válido encontrado no envio.', 400);
                return;
            }

            // Create temporary folder to extract
            $tempDir = sys_get_temp_dir() . '/rubble_ponto_' . uniqid();
            if (!mkdir($tempDir, 0777, true) && !is_dir($tempDir)) {
                Response::error('Falha ao criar diretório temporário para processamento.', 500);
                return;
            }

            $savedPaths = [];
            foreach ($fileList as $f) {
                $dest = $tempDir . '/' . basename($f['name']);
                if (move_uploaded_file($f['tmp_name'], $dest) || copy($f['tmp_name'], $dest)) {
                    $savedPaths[] = $dest;
                }
            }

            if (empty($savedPaths)) {
                @rmdir($tempDir);
                Response::error('Não foi possível armazenar os arquivos PDF temporariamente.', 500);
                return;
            }

            // Call python extractor
            $pythonScript = __DIR__ . '/../Python/ponto_pdf_extractor.py';
            $cmd = sprintf('python3 %s --dir %s 2>&1', escapeshellarg($pythonScript), escapeshellarg($tempDir));

            $outputLines = [];
            $returnCode = 0;
            exec($cmd, $outputLines, $returnCode);

            // Clean up temp files
            foreach ($savedPaths as $sp) {
                @unlink($sp);
            }
            @rmdir($tempDir);

            $outputStr = trim(implode("\n", $outputLines));
            $jsonStart = strpos($outputStr, '{');
            if ($jsonStart !== false) {
                $outputStr = substr($outputStr, $jsonStart);
            }

            $decoded = json_decode($outputStr, true);
            if (!is_array($decoded) || !($decoded['success'] ?? false)) {
                $err = $decoded['error'] ?? 'Falha ao extrair dados dos PDFs.';
                Response::error($err, 400);
                return;
            }

            $extracted = $decoded['dados'] ?? [];
            $uploadId = (new \App\Api\Repositories\PontoRepository())->createUpload('lote_' . date('Ymd_His') . '.pdf');
            $importResult = $this->service->importExtractedData($extracted, $uploadId);

            Response::json([
                'success' => true,
                'message' => sprintf(
                    '%d PDF(s) processado(s): %d colaborador(es) e %d registro(s) importados.',
                    count($savedPaths),
                    $importResult['total_colaboradores'],
                    $importResult['total_registros']
                ),
                'total_arquivos' => count($savedPaths),
                'total_colaboradores' => $importResult['total_colaboradores'],
                'total_registros' => $importResult['total_registros'],
            ]);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
            return;
        }
    }
}
