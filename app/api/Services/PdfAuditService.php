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
                'message' => self::extractDetail($data),
            ];
        }

        $this->saveReferenceSession(json_decode($response, true));

        return [
            'success' => true,
            'data' => json_decode($response, true)
        ];
    }

    public function audit(array $files, string $photoIndices = '', string $aiEnabled = 'true'): array
    {
        $boundary = '----' . bin2hex(random_bytes(16));
        $body = '';

        if ($photoIndices !== '') {
            $body .= "--$boundary\r\n";
            $body .= "Content-Disposition: form-data; name=\"photo_indices\"\r\n\r\n";
            $body .= $photoIndices . "\r\n";
        }

        $body .= "--$boundary\r\n";
        $body .= "Content-Disposition: form-data; name=\"ai_enabled\"\r\n\r\n";
        $body .= $aiEnabled . "\r\n";

        foreach ($files as $file) {
            $body .= "--$boundary\r\n";
            $body .= "Content-Disposition: form-data; name=\"files\"; filename=\"{$file['name']}\"\r\n";
            $body .= "Content-Type: application/pdf\r\n\r\n";
            $body .= file_get_contents($file['tmp_name']) . "\r\n";
        }
        $body .= "--$boundary--\r\n";

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->checkerUrl . '/audit',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: multipart/form-data; boundary=' . $boundary,
                'Expect:',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 300,
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            $data = json_decode($response, true);
            return [
                'success' => false,
                'message' => self::extractDetail($data, 'Erro ao processar auditoria no serviço PDF'),
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

    private static function extractDetail(?array $data, string $default = 'Erro ao processar referência no serviço PDF'): string
    {
        $detail = $data['detail'] ?? null;
        return is_string($detail) ? $detail : $default;
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
