<?php

namespace App\Api\Services;

use App\Api\Helpers\MailerFactory;
use App\Api\Repositories\PvRepository;
use App\Api\Repositories\SolicitacaoCompraRepository;
use App\Config\Env;

class SmEmailService
{
    private const MAX_PHOTOS     = 10;
    private const MAX_PHOTO_SIZE = 512000; // 500 KB
    private const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];
    private const ALLOWED_EXTS   = ['jpg', 'jpeg', 'png', 'webp'];

    public function buildSubject(array $sc, bool $isBatch = false, array $allScs = []): string
    {
        if ($isBatch && count($allScs) > 1) {
            $nums = implode(', ', array_map(fn($s) => $s['numero_sm'] ?? '-', $allScs));
            $site = $allScs[0]['site'] ?? '-';
            return "SMs: {$nums} - {$site} - Solicitação de Materiais";
        }

        $sm    = $sc['numero_sm'] ?? '-';
        $site  = $sc['site']      ?? '-';
        $equip = $sc['equipamento'] ?? $sc['equipamento_texto'] ?? '';
        $pv    = $sc['numero_pv'] ?? null;

        $subject = "SM: {$sm} - {$site} - Solicitação de Materiais";
        if ($equip !== '' && $equip !== null) {
            $subject .= " - {$equip}";
        }
        if ($pv !== null && $pv !== '') {
            $subject .= " - PV {$pv}";
        }
        return $subject;
    }

    public function buildBody(array $sc, bool $isBatch = false, array $allScs = []): string
    {
        $e = fn(?string $v): string => htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8');

        $rows = $isBatch ? $allScs : [$sc];

        $tableRows = '';
        foreach ($rows as $row) {
            $equip  = $e($row['equipamento'] ?? $row['equipamento_texto'] ?? '—');
            $pv     = $e($row['numero_pv'] ?? '—');
            $data   = $e($row['data'] ?? '—');
            $titulo = $e($row['titulo_email'] ?? '—');
            $sm     = $e($row['numero_sm'] ?? '—');
            $site   = $e($row['site'] ?? '—');

            $tableRows .= "
            <tr>
              <td style='padding:8px;border:1px solid #ddd;'>{$sm}</td>
              <td style='padding:8px;border:1px solid #ddd;'>{$site}</td>
              <td style='padding:8px;border:1px solid #ddd;'>{$equip}</td>
              <td style='padding:8px;border:1px solid #ddd;'>{$pv}</td>
              <td style='padding:8px;border:1px solid #ddd;'>{$data}</td>
              <td style='padding:8px;border:1px solid #ddd;'>{$titulo}</td>
            </tr>";
        }

        $observacaoHtml = '';
        if (!$isBatch && !empty($sc['observacao'])) {
            $obs = nl2br($e($sc['observacao']));
            $observacaoHtml = "
            <h3 style='color:#334155;margin-top:24px;'>Materiais / Descrição da Solicitação</h3>
            <div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;color:#334155;'>
                {$obs}
            </div>";
        }

        return "
        <html><body style='font-family:Arial,sans-serif;color:#334155;max-width:800px;margin:0 auto;padding:24px;'>
            <h2 style='color:#0f172a;'>Solicitação de Materiais — Rubble</h2>
            <p>Prezados,<br>
            Solicitamos, por gentileza, o fornecimento/cotação dos materiais descritos abaixo para atendimento da solicitação:</p>
            <table style='border-collapse:collapse;width:100%;margin-top:16px;font-size:14px;'>
                <thead>
                    <tr style='background:#f1f5f9;'>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Nº SM</th>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Site</th>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Equipamento</th>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>PV Vinculada</th>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Data</th>
                        <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Título / Objeto</th>
                    </tr>
                </thead>
                <tbody>{$tableRows}</tbody>
            </table>
            {$observacaoHtml}
            <p style='margin-top:32px;font-size:12px;color:#94a3b8;'>Este e-mail foi gerado automaticamente pelo sistema Rubble.</p>
        </body></html>";
    }

    public function validatePhotos(array $files): void
    {
        if (count($files) > self::MAX_PHOTOS) {
            throw new \InvalidArgumentException('Máximo de ' . self::MAX_PHOTOS . ' fotos por envio.');
        }

        foreach ($files as $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                throw new \InvalidArgumentException('Erro no upload de uma das fotos.');
            }
            if (($file['size'] ?? 0) > self::MAX_PHOTO_SIZE) {
                $name = $file['name'] ?? 'foto';
                throw new \InvalidArgumentException("A foto \"{$name}\" excede o limite de 500 KB.");
            }
            $type = $file['type'] ?? '';
            if (!in_array($type, self::ALLOWED_TYPES, true)) {
                $name = $file['name'] ?? 'foto';
                throw new \InvalidArgumentException("O tipo de arquivo \"{$name}\" é inválido. Formatos aceitos: JPG, PNG, WEBP.");
            }
        }
    }

    public function savePhotos(string $numeroSm, array $files): array
    {
        $imageDir = SolicitacaoCompraRepository::IMAGE_DIR;
        if (!is_dir($imageDir)) {
            mkdir($imageDir, 0775, true);
        }

        $saved = [];
        foreach ($files as $file) {
            $origName = $file['name'] ?? 'foto.jpg';
            $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            if (!in_array($ext, self::ALLOWED_EXTS, true)) {
                $ext = 'jpg';
            }
            $filename = 'SM_' . $numeroSm . '_' . time() . '_' . uniqid() . '.' . $ext;
            $dest     = $imageDir . '/' . $filename;

            if (isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
                if (!move_uploaded_file($file['tmp_name'], $dest)) {
                    throw new \RuntimeException("Falha ao salvar a foto {$origName}.");
                }
            } elseif (isset($file['tmp_name']) && file_exists($file['tmp_name'])) {
                if (!copy($file['tmp_name'], $dest)) {
                    throw new \RuntimeException("Falha ao salvar a foto {$origName}.");
                }
            } else {
                throw new \RuntimeException("Arquivo temporário inválido para a foto {$origName}.");
            }
            $saved[] = $dest;
        }
        return $saved;
    }

    private function resolvePdfPathsSm(array $sc): array
    {
        $numeroPv = $sc['numero_pv'] ?? null;
        if (empty($numeroPv)) {
            return [];
        }

        $pdfPaths = [];
        $osDir = PvRepository::OS_DIR;
        $laudoDir = PvRepository::LAUDO_DIR;

        // Tenta resolver OS da PV através do PvRepository se disponível
        try {
            $pvRepo = new PvRepository();
            $pv = $pvRepo->getByNumberPv((string) $numeroPv);
            if ($pv !== null && !empty($pv->tickets)) {
                foreach ($pv->tickets as $ticket) {
                    $osNum = preg_replace('/[^a-zA-Z0-9_-]/', '', trim((string) ($ticket['os'] ?? '')));
                    if ($osNum === '') continue;

                    $osPdf = $osDir . '/' . $osNum . '.pdf';
                    if (file_exists($osPdf)) {
                        $pdfPaths[] = $osPdf;
                    }
                    $laudoPdf = $laudoDir . '/' . $osNum . '.pdf';
                    if (file_exists($laudoPdf)) {
                        $pdfPaths[] = $laudoPdf;
                    }
                }
            }
        } catch (\Throwable $e) {
            error_log('SmEmailService resolvePdfPathsSm aviso: ' . $e->getMessage());
        }

        return array_values(array_unique($pdfPaths));
    }

    public function send(array $sc, array $uploadedPhotos = []): array
    {
        $this->validatePhotos($uploadedPhotos);

        $pdfPaths   = $this->resolvePdfPathsSm($sc);
        $photoPaths = !empty($uploadedPhotos)
            ? $this->savePhotos($sc['numero_sm'] ?? 'SM', $uploadedPhotos)
            : [];

        $subject = $this->buildSubject($sc);
        $body    = $this->buildBody($sc);

        return $this->configureAndSend($subject, $body, $pdfPaths, $photoPaths);
    }

    public function sendBatch(array $scs, array $uploadedPhotos = []): array
    {
        if (empty($scs)) {
            return ['success' => false, 'message' => 'Nenhuma solicitação selecionada.'];
        }

        $this->validatePhotos($uploadedPhotos);

        $pdfPaths = [];
        foreach ($scs as $sc) {
            $pdfPaths = array_merge($pdfPaths, $this->resolvePdfPathsSm($sc));
        }
        $pdfPaths = array_values(array_unique($pdfPaths));

        $firstSm    = $scs[0]['numero_sm'] ?? 'SM';
        $photoPaths = !empty($uploadedPhotos)
            ? $this->savePhotos($firstSm, $uploadedPhotos)
            : [];

        $subject = $this->buildSubject($scs[0], true, $scs);
        $body    = $this->buildBody($scs[0], true, $scs);

        return $this->configureAndSend($subject, $body, $pdfPaths, $photoPaths);
    }

    private function configureAndSend(string $subject, string $body, array $pdfPaths, array $photoPaths): array
    {
        $toEmails = [];
        $rawTo = (string) (Env::get('SM_EMAILS') ?: Env::get('SM_EMAIL', ''));
        foreach (explode(',', $rawTo) as $email) {
            $email = trim($email);
            if ($email !== '') $toEmails[] = $email;
        }
        $ccEmails = [];
        $rawCc = (string) (Env::get('SM_EMAILS_CC') ?: Env::get('SM_EMAIL_CC', ''));
        foreach (explode(',', $rawCc) as $email) {
            $email = trim($email);
            if ($email !== '') $ccEmails[] = $email;
        }

        if (empty($toEmails)) {
            return ['success' => false, 'message' => 'Destinatários SM_EMAILS não configurados no .env.'];
        }

        try {
            $mail = MailerFactory::create(60);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $body));

            $replyTo = Env::get('PV_REPLY_TO', '');
            if ($replyTo !== '') {
                $mail->addReplyTo($replyTo, Env::get('SMTP_FROM_NAME', 'Rubble'));
            }

            foreach ($toEmails   as $email) $mail->addAddress($email);
            foreach ($ccEmails   as $email) $mail->addCC($email);
            foreach ($pdfPaths   as $path)  $mail->addAttachment($path);
            foreach ($photoPaths as $path)  $mail->addAttachment($path);

            $mail->send();
            return ['success' => true, 'message' => 'E-mail enviado com sucesso'];
        } catch (\Throwable $e) {
            error_log('Erro ao enviar e-mail SM: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Erro ao enviar e-mail. Tente novamente mais tarde.'];
        }
    }
}
