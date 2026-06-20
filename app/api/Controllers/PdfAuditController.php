<?php

namespace App\Api\Controllers;

use App\Api\Services\PdfAuditService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;

class PdfAuditController
{
    private PdfAuditService $service;

    public function __construct()
    {
        $this->service = new PdfAuditService();
    }

    public function setReference(): void
    {
        try {
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                Response::error('Nenhum arquivo enviado ou erro no upload', 400);
                return;
            }

            $file = $_FILES['file'];
            $result = $this->service->setReference($file);

            if (!$result['success']) {
                Response::error($result['message'] ?? 'Erro ao processar referência', 400);
                return;
            }

            Response::success('Referência definida', $result['data']);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function audit(): void
    {
        try {
            $files = $_FILES['files'] ?? null;
            if (!$files || !isset($files['name']) || !is_array($files['name'])) {
                Response::error('Nenhum arquivo enviado', 400);
                return;
            }

            $uploadedFiles = [];
            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $uploadedFiles[] = [
                        'name' => $files['name'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'size' => $files['size'][$i]
                    ];
                }
            }

            if (empty($uploadedFiles)) {
                Response::error('Nenhum arquivo válido enviado', 400);
                return;
            }

            $photoIndices = $_POST['photo_indices'] ?? '';
            $aiEnabled = $_POST['ai_enabled'] ?? 'true';
            $result = $this->service->audit($uploadedFiles, $photoIndices, $aiEnabled);
            Response::json($result);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function health(): void
    {
        try {
            $result = $this->service->health();
            if ($result) {
                Response::json($result);
            } else {
                Response::error('Serviço PDF Checker indisponível', 503);
            }
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getReference(): void
    {
        try {
            $result = $this->service->getReference();
            if ($result) {
                Response::success('OK', ['reference' => $result]);
            } else {
                Response::success('Nenhuma referência', ['reference' => null]);
            }
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function clearReference(): void
    {
        try {
            $this->service->clearReference();
            Response::success('Referência removida');
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
