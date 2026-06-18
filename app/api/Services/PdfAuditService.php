<?php

namespace App\Api\Services;

use App\Config\Env;

class PdfAuditService
{
    private string $checkerUrl;

    public function __construct()
    {
        $this->checkerUrl = Env::get('PDF_CHECKER_URL', 'http://pdf-checker:8000');
    }

    public function setReference(array $file): array
    {
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->checkerUrl . '/set-reference',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => [
                'file' => new \CURLFile($file['tmp_name'], $file['type'] ?? 'application/pdf', $file['name'])
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTPHEADER => ['Expect:'],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            $data = json_decode($response, true);
            return [
                'success' => false,
                'message' => $data['detail'] ?? 'Erro ao processar referência no serviço PDF'
            ];
        }

        $this->saveReferenceSession(json_decode($response, true));

        return [
            'success' => true,
            'data' => json_decode($response, true)
        ];
    }

    public function audit(array $files): array
    {
        $multipart = [];
        foreach ($files as $i => $file) {
            $multipart['files[' . $i . ']'] = new \CURLFile(
                $file['tmp_name'],
                'application/pdf',
                $file['name']
            );
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->checkerUrl . '/audit',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $multipart,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_HTTPHEADER => ['Expect:'],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            $data = json_decode($response, true);
            return [
                'success' => false,
                'message' => $data['detail'] ?? 'Erro ao processar auditoria no serviço PDF',
                'results' => []
            ];
        }

        return json_decode($response, true) ?? ['success' => false, 'results' => []];
    }

    public function health(): ?array
    {
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->checkerUrl . '/health',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            return null;
        }

        return json_decode($response, true);
    }

    public function getReference(): ?array
    {
        $sessionFile = $this->getSessionFilePath();
        if (file_exists($sessionFile)) {
            $data = json_decode(file_get_contents($sessionFile), true);
            return $data['reference'] ?? null;
        }
        return null;
    }

    public function clearReference(): void
    {
        $sessionFile = $this->getSessionFilePath();
        if (file_exists($sessionFile)) {
            unlink($sessionFile);
        }
    }

    private function saveReferenceSession(array $data): void
    {
        $sessionFile = $this->getSessionFilePath();
        $dir = dirname($sessionFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($sessionFile, json_encode([
            'reference' => $data
        ]));
    }

    private function getSessionFilePath(): string
    {
        return sys_get_temp_dir() . '/pdf-audit/session.json';
    }
}
