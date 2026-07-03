<?php

namespace App\Api\Controllers;

use App\Api\Repositories\PvRepository;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;

class UploadController
{
    public function uploadFile(): void
    {
        try {
            $type = $_POST['type'] ?? '';

            if (!in_array($type, ['os', 'laudo', 'orcamento'], true)) {
                Response::error('Tipo inválido. Use "os", "laudo" ou "orcamento"', 400);
                return;
            }

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $errorCode = $_FILES['file']['error'] ?? -1;
                $errorMsg = match ($errorCode) {
                    UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Arquivo excede o tamanho máximo',
                    UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
                    default => 'Erro no upload do arquivo',
                };
                error_log("[UPLOAD] Falha no upload: error_code={$errorCode}, type={$type}, _FILES=" . json_encode($_FILES['file'] ?? []));
                Response::error($errorMsg, 400);
                return;
            }

            $file = $_FILES['file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if ($ext !== 'pdf') {
                Response::error('Apenas arquivos PDF são permitidos', 400);
                return;
            }

            $maxSize = 10 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                Response::error('Arquivo excede o tamanho máximo de 10MB', 400);
                return;
            }

            $tmpPath = $file['tmp_name'];
            $handle = fopen($tmpPath, 'r');
            $firstBytes = fread($handle, 5);
            fclose($handle);
            if ($firstBytes !== '%PDF-') {
                Response::error('Arquivo não é um PDF válido', 400);
                return;
            }

            $dir = $type === 'os'
                ? PvRepository::OS_DIR
                : PvRepository::LAUDO_DIR;

            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
                error_log("[UPLOAD] Diretório criado: {$dir}");
            }

            if (!is_writable($dir)) {
                error_log("[UPLOAD] Diretório NÃO gravável: {$dir}, perms=" . substr(sprintf('%o', fileperms($dir)), -4));
                Response::error('Diretório de destino sem permissão de escrita', 500);
                return;
            }

            $osNumber = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['os_number'] ?? '');
            if (empty($osNumber)) {
                $osNumber = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file['name'], PATHINFO_FILENAME));
            }
            $filename = $osNumber . '.pdf';
            $destPath = $dir . '/' . $filename;

            $nameWithoutExt = $osNumber;

            $moveOk = move_uploaded_file($file['tmp_name'], $destPath);
            if (!$moveOk) {
                $errNo = error_get_last();
                error_log("[UPLOAD] move_uploaded_file FALHOU: tmp={$tmpPath}, dest={$destPath}, error=" . ($errNo['message'] ?? 'unknown'));
                Response::error('Falha ao salvar arquivo no servidor', 500);
                return;
            }

            error_log("[UPLOAD] Sucesso: {$destPath}, size={$file['size']}");
            Response::success('Arquivo enviado com sucesso', [
                'filename' => $nameWithoutExt,
            ]);

        } catch (\Throwable $e) {
            error_log("[UPLOAD] Exceção: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
            Response::serverError($e, 500);
        }
    }
}
