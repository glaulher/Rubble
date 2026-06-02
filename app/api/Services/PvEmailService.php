<?php

namespace App\Api\Services;

use App\Api\Helpers\MailerFactory;
use App\Api\Repositories\PvRepository;
use App\Config\Env;

class PvEmailService
{
    public function send(array $pv, array $items, string $subjectKey, ?string $uf = null, ?string $local = null): array
    {
        if (!$uf) {
            $uf = $pv['uf'] ?? '';
        }
        $envKey = $uf === 'ES' ? 'PV_EMAILS_ES' : 'PV_EMAILS_RJ';

        $displayLocation = $local ?: $pv['local'];
        $displayAddress = $pv['local_do_endereco'] ?? $pv['local'];

        $tickets = $pv['tickets'] ?? [];
        $osNumbers = array_map(fn(array $r) => $r['os'], $tickets);
        $osStr = implode(', ', $osNumbers);

        $subjects = [
            'materiais' => "PV: {$pv['numero_pv']} - {$displayLocation} - Aquisição de Materiais - {$displayAddress} - {$osStr}",
            'servicos' => "PV: {$pv['numero_pv']} - {$displayLocation} - Execução de serviços - {$displayAddress} - {$osStr}",
            'contratacao' => "PV: {$pv['numero_pv']} - {$displayLocation} - Contratação de Serviços - {$displayAddress} - {$osStr}",
        ];

        if (!isset($subjects[$subjectKey])) {
            return ['success' => false, 'message' => 'Assunto inválido'];
        }

        if (empty($osNumbers)) {
            return ['success' => false, 'message' => 'PV não possui número de OS'];
        }

        $subject = $subjects[$subjectKey];

        $pdfPaths = [];
        $osDir = PvRepository::OS_DIR;
        foreach ($osNumbers as $osNum) {
            $osNum = trim($osNum);
            if ($osNum === '') continue;
            $path = $osDir . '/' . $osNum . '.pdf';
            if (!file_exists($path)) {
                return [
                    'success' => false,
                    'message' => "PDF da OS {$osNum} não encontrado. Coloque o arquivo em OS/{$osNum}.pdf e tente novamente."
                ];
            }
            $pdfPaths[] = $path;
        }
        if (empty($pdfPaths)) {
            return ['success' => false, 'message' => 'PV não possui número de OS'];
        }

        $reportPaths = [];
        foreach ($items as $item) {
            $report = $item['laudo'] ?? null;
            if ($report && $report !== 'N/A') {
                $reportDir = PvRepository::LAUDO_DIR;
                $path = $reportDir . '/' . $report . '.pdf';
                if (!file_exists($path)) {
                    return [
                        'success' => false,
                        'message' => "PDF do laudo {$report} não encontrado. Coloque o arquivo em LAUDO/{$report}.pdf e tente novamente."
                    ];
                }
                $reportPaths[] = $path;
            }
        }

        $orcamentoPaths = [];
        foreach ($items as $item) {
            $orcamento = $item['orcamento'] ?? null;
            if ($orcamento) {
                $files = array_map('trim', explode(',', $orcamento));
                foreach ($files as $file) {
                    if (empty($file)) continue;
                    $path = PvRepository::LAUDO_DIR . '/' . $file . '.pdf';
                    if (file_exists($path)) {
                        $orcamentoPaths[] = $path;
                    }
                }
            }
        }

        $body = $this->buildBody($pv, $items, $subjectKey, false);

        try {
            $mail = MailerFactory::create(60);

            $emails = explode(',', Env::get($envKey, ''));
            foreach ($emails as $email) {
                $email = trim($email);
                if ($email !== '') {
                    $mail->addAddress($email);
                }
            }

            $ccKey = $envKey . '_CC';
            $ccEmails = explode(',', Env::get($ccKey, ''));
            foreach ($ccEmails as $email) {
                $email = trim($email);
                if ($email !== '') {
                    $mail->addCC($email);
                }
            }

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            foreach ($pdfPaths as $p) {
                $mail->addAttachment($p);
            }

            foreach ($reportPaths as $lp) {
                $mail->addAttachment($lp);
            }

            foreach ($orcamentoPaths as $orc) {
                $mail->addAttachment($orc);
            }

            $mail->send();

            return ['success' => true, 'message' => 'E-mail enviado com sucesso'];
        } catch (\Throwable $e) {
            $logMsg = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            error_log('Erro ao enviar e-mail PV: ' . $logMsg);
            return ['success' => false, 'message' => 'Erro ao enviar e-mail. Tente novamente mais tarde.'];
        }
    }

    public function sendBatch(array $pvs, array $items, string $subjectKey, ?string $uf = null, ?string $local = null): array
    {
        if (empty($pvs)) {
            return ['success' => false, 'message' => 'Nenhuma PV selecionada'];
        }

        $firstPv = $pvs[0];

        if (!$uf) {
            $uf = $firstPv['uf'] ?? '';
        }
        $envKey = $uf === 'ES' ? 'PV_EMAILS_ES' : 'PV_EMAILS_RJ';

        $displayLocation = $local ?: $firstPv['local'];
        $displayAddress = $firstPv['local_do_endereco'] ?? $firstPv['local'];

        $allOsNumbers = [];
        foreach ($pvs as $pv) {
            $osVal = $pv['os'] ?? '';
            if (!is_string($osVal) || $osVal === '') continue;
            $parts = array_map('trim', explode(',', $osVal));
            $allOsNumbers = array_merge($allOsNumbers, $parts);
        }
        $allOsNumbers = array_unique($allOsNumbers);
        $osStr = implode(', ', $allOsNumbers);

        $allPvNums = implode(', ', array_map(fn($p) => $p['numero_pv'] ?? '-', $pvs));

        $subjects = [
            'materiais' => "PVs: {$allPvNums} - {$displayLocation} - Aquisição de Materiais - {$displayAddress} - {$osStr}",
            'servicos' => "PVs: {$allPvNums} - {$displayLocation} - Execução de serviços - {$displayAddress} - {$osStr}",
            'contratacao' => "PVs: {$allPvNums} - {$displayLocation} - Contratação de Serviços - {$displayAddress} - {$osStr}",
        ];

        if (!isset($subjects[$subjectKey])) {
            return ['success' => false, 'message' => 'Assunto inválido'];
        }

        if (empty($allOsNumbers)) {
            return ['success' => false, 'message' => 'Nenhuma PV possui número de OS'];
        }

        $subject = $subjects[$subjectKey];

        // Validate OS PDFs
        $pdfPaths = [];
        $osDir = PvRepository::OS_DIR;
        foreach ($allOsNumbers as $osNum) {
            $path = $osDir . '/' . $osNum . '.pdf';
            if (!file_exists($path)) {
                return [
                    'success' => false,
                    'message' => "PDF da OS {$osNum} não encontrado. Coloque o arquivo em OS/{$osNum}.pdf e tente novamente."
                ];
            }
            $pdfPaths[] = $path;
        }
        if (empty($pdfPaths)) {
            return ['success' => false, 'message' => 'Nenhuma OS válida para anexar'];
        }

        // Validate laudo PDFs
        $reportPaths = [];
        foreach ($items as $item) {
            $report = $item['laudo'] ?? null;
            if ($report && $report !== 'N/A') {
                $reportDir = PvRepository::LAUDO_DIR;
                $path = $reportDir . '/' . $report . '.pdf';
                if (!file_exists($path)) {
                    return [
                        'success' => false,
                        'message' => "PDF do laudo {$report} não encontrado. Coloque o arquivo em LAUDO/{$report}.pdf e tente novamente."
                    ];
                }
                $reportPaths[] = $path;
            }
        }

        $orcamentoPaths = [];
        foreach ($items as $item) {
            $orcamento = $item['orcamento'] ?? null;
            if ($orcamento) {
                $files = array_map('trim', explode(',', $orcamento));
                foreach ($files as $file) {
                    if (empty($file)) continue;
                    $path = PvRepository::LAUDO_DIR . '/' . $file . '.pdf';
                    if (file_exists($path)) {
                        $orcamentoPaths[] = $path;
                    }
                }
            }
        }

        // Build body with isBatch=true
        $body = $this->buildBody($firstPv, $items, $subjectKey, true);

        try {
            $mail = MailerFactory::create(60);

            $emails = explode(',', Env::get($envKey, ''));
            foreach ($emails as $email) {
                $email = trim($email);
                if ($email !== '') {
                    $mail->addAddress($email);
                }
            }

            $ccKey = $envKey . '_CC';
            $ccEmails = explode(',', Env::get($ccKey, ''));
            foreach ($ccEmails as $email) {
                $email = trim($email);
                if ($email !== '') {
                    $mail->addCC($email);
                }
            }

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            foreach ($pdfPaths as $p) {
                $mail->addAttachment($p);
            }
            foreach ($reportPaths as $lp) {
                $mail->addAttachment($lp);
            }

            foreach ($orcamentoPaths as $orc) {
                $mail->addAttachment($orc);
            }

            $mail->send();

            return ['success' => true, 'message' => 'E-mail enviado com sucesso'];
        } catch (\Throwable $e) {
            $logMsg = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            error_log('Erro ao enviar e-mail PV batch: ' . $logMsg);
            return ['success' => false, 'message' => 'Erro ao enviar e-mail. Tente novamente mais tarde.'];
        }
    }

    private function buildBody(array $pv, array $items, string $subjectKey = '', bool $isBatch = false): string
    {
        $e = fn(?string $v): string => htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8');

        $hasLaudo = false;
        foreach ($items as $item) {
            if (!empty($item['laudo']) && $item['laudo'] !== 'N/A') {
                $hasLaudo = true;
                break;
            }
        }

        $hasFlpu = false;
        foreach ($items as $item) {
            if (($item['fatura'] ?? '') === 'flpu') {
                $hasFlpu = true;
                break;
            }
        }

        $flpuTh = $hasFlpu
            ? "<th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Valor s/ BDI</th><th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>BDI (%)</th>"
            : '';

        $pvTh = $isBatch ? "<th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>PV</th>" : '';

        $rowsHtml = '';
        foreach ($items as $item) {
            $lpuOrigin = $item['lpu_origem'] ?? '';
            $lpuLabel = '';
            if ($lpuOrigin) {
                $lpuLabel = str_replace('lpu_', '', $lpuOrigin);
                $lpuLabel = str_replace('_', ' ', $lpuLabel);
                $lpuLabel = ucwords($lpuLabel);
            } else {
                $lpuLabel = 'FLPU';
            }
            $itemNumber = $item['numero_item'] ?? '-';
            $lpuDescription = $e($item['descricao_lpu'] ?? '-');
            $description = $e($item['descricao'] ?? '-');
            $value = isset($item['valor']) ? number_format((float) $item['valor'], 2, ',', '.') : '-';
            $flpuSource = $item['valor_flpu'] ?? $item['valor'] ?? null;
            $flpuValue = $flpuSource !== null ? number_format((float) $flpuSource, 2, ',', '.') : '-';
            $qty = $item['quantidade'] ?? '-';
            $bdi = isset($item['bdi']) ? $item['bdi'] . '%' : '-';
            $totalValue = isset($item['valor_total']) ? number_format((float) $item['valor_total'], 2, ',', '.') : '-';
            $reportItem = $e($item['laudo'] ?? '');

            $reportCell = $hasLaudo ? "<td style='padding:8px;border:1px solid #ddd;text-align:center;'>{$reportItem}</td>" : '';
            $flpuCell1 = $hasFlpu ? "<td style='padding:8px;border:1px solid #ddd;text-align:right;'>R$ {$flpuValue}</td>" : '';
            $flpuCell2 = $hasFlpu ? "<td style='padding:8px;border:1px solid #ddd;text-align:right;'>{$bdi}</td>" : '';

            $pvCell = $isBatch ? "<td style='padding:8px;border:1px solid #ddd;'>{$e($item['numero_pv'] ?? '-')}</td>" : '';

            $rowsHtml .= "
                <tr>
                    {$pvCell}
                    <td style='padding:8px;border:1px solid #ddd;'>{$lpuLabel}</td>
                    <td style='padding:8px;border:1px solid #ddd;'>{$itemNumber}</td>
                    <td style='padding:8px;border:1px solid #ddd;'>{$lpuDescription}</td>
                    <td style='padding:8px;border:1px solid #ddd;'>{$description}</td>
                    <td style='padding:8px;border:1px solid #ddd;text-align:right;'>R$ {$value}</td>
                    {$flpuCell1}
                    {$flpuCell2}
                    {$reportCell}
                    <td style='padding:8px;border:1px solid #ddd;text-align:right;'>{$qty}</td>
                    <td style='padding:8px;border:1px solid #ddd;text-align:right;'>R$ {$totalValue}</td>
                </tr>
            ";
        }

        $grandTotal = array_sum(array_map(fn($i) => (float) ($i['valor_total'] ?? 0), $items));
        $formattedTotal = number_format($grandTotal, 2, ',', '.');

        $equipmentInfo = '';
        if (!empty($pv['equipamento'])) {
            $equipmentInfo = ' ' . $e($pv['equipamento']);
            if (!empty($pv['capacidade'])) {
                $equipmentInfo .= ' - ' . number_format((float) $pv['capacidade'], 0, ',', '.') . ' TR';
            }
        }

        $reportTh = $hasLaudo ? "<th style='padding:10px;border:1px solid #ddd;text-align:center;font-size:12px;'>Laudo</th>" : '';
        $colspan = 6;
        if ($hasFlpu) $colspan += 2;
        if ($hasLaudo) $colspan += 1;
        if ($isBatch) $colspan += 1;

        $memorialHtml = '';
        $hasFilter = false;
        foreach ($items as $item) {
            if (!empty($item['filtro_data'])) {
                $hasFilter = true;
                break;
            }
        }
        if ($hasFilter) {
            $memorialRows = '';
            foreach ($items as $item) {
                if (empty($item['filtro_data'])) continue;
                $fd = json_decode($item['filtro_data'], true);
                if (!$fd) continue;
                $itemNum = $e($item['numero_item'] ?? '-');
                $desc = $e($item['descricao'] ?? '-');
                $tamanho = $e($fd['tamanho'] ?? '-');
                $pecas = $fd['qtd_pecas'] ?? 0;
                $areaPlaca = isset($fd['area_placa']) ? number_format((float)$fd['area_placa'], 4, ',', '.') : '-';
                $areaTotal = isset($fd['area_plana_total']) ? number_format((float)$fd['area_plana_total'], 4, ',', '.') : '-';
                $qtdCobrar = $fd['qtd_cobrar'] ?? 0;
                $memorialRows .= "
                    <tr>
                        <td style='padding:8px;border:1px solid #ddd;'>{$itemNum}</td>
                        <td style='padding:8px;border:1px solid #ddd;'>{$desc}</td>
                        <td style='padding:8px;border:1px solid #ddd;'>{$tamanho}</td>
                        <td style='padding:8px;border:1px solid #ddd;text-align:right;'>{$pecas}</td>
                        <td style='padding:8px;border:1px solid #ddd;text-align:right;'>{$areaPlaca}</td>
                        <td style='padding:8px;border:1px solid #ddd;text-align:right;'>{$areaTotal}</td>
                        <td style='padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;'>{$qtdCobrar}</td>
                    </tr>
                ";
            }
            $memorialHtml = "
                <div style='margin-top:24px;margin-bottom:16px;'>
                    <h3 style='font-size:14px;font-weight:bold;color:#334155;margin-bottom:8px;'>Memorial de Cálculo</h3>
                    <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;width:100%;'>
                        <thead>
                            <tr style='background-color:#f1f5f9;'>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Nº Item</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Descrição</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Tamanho</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Peças</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Área placa (m²)</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Área total (m²)</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Qtd cobrar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$memorialRows}
                        </tbody>
                    </table>
                </div>
            ";
        }

        $locality = $pv['localidade'] ?? '';
        if ($isBatch) {
            if ($subjectKey === 'servicos') {
                $intro = "Solicitamos, por favor, a aprovação para o faturamento dos itens tabelados abaixo.";
                $closing = 'Ficamos no aguardo do retorno';
            } else {
                $intro = "Solicitamos, por gentileza, a análise dos materiais relacionados na tabela abaixo, necessários para darmos continuidade ao reparo da(s) máquina(s).";
                $closing = 'Ficamos no aguardo do retorno para seguimento das tratativas.';
            }
        } elseif ($hasFilter && $locality !== '') {
            if ($subjectKey === 'servicos') {
                $intro = "Solicitamos, por favor, a aprovação para o faturamento dos itens tabelados abaixo.";
                $closing = 'Ficamos no aguardo do retorno';
            } else {
                $intro = "Solicitamos, por gentileza, a análise dos materiais relacionados na tabela abaixo, necessários para darmos continuidade ao reparo da(s) máquina(s).";
                $closing = 'Ficamos no aguardo do retorno para seguimento das tratativas.';
            }
        } elseif ($subjectKey === 'servicos') {
            $intro = "Solicitamos, por favor, a aprovação para o faturamento dos itens tabelados abaixo. Máquina atendida -{$equipmentInfo}.";
            $closing = 'Ficamos no aguardo do retorno';
        } else {
            $intro = "Solicitamos, por gentileza, a análise dos materiais relacionados na tabela abaixo, necessários para darmos continuidade ao reparo da máquina{$equipmentInfo}.";
            $closing = 'Ficamos no aguardo do retorno para seguimento das tratativas.';
        }

        return "
            <div style='font-family:Arial,sans-serif;padding:20px;max-width:800px;'>
                <p>Olá, pessoal,</p>
                <p>{$intro}</p>
                <p>{$closing}</p>
                {$memorialHtml}
                <div style='margin-top:24px;'>
                    <h3 style='font-size:14px;font-weight:bold;color:#334155;margin-bottom:8px;'>Proposta</h3>
                    <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;width:100%;'>
                        <thead>
                            <tr style='background-color:#f1f5f9;'>
                                {$pvTh}
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>LPU Origem</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Nº</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Descrição LPU</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:left;font-size:12px;'>Especificação</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Valor LPU</th>
                                {$flpuTh}
                                {$reportTh}
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Qtd</th>
                                <th style='padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;'>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style='background-color:#f8fafc;'>
                                <td colspan='{$colspan}' style='padding:10px;border:1px solid #ddd;text-align:right;font-weight:bold;'>Total Geral</td>
                                <td style='padding:10px;border:1px solid #ddd;text-align:right;font-weight:bold;'>R$ {$formattedTotal}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <p style='margin-top:24px;color:#64748b;font-size:12px;'>E-mail automático do sistema Rubble.</p>
            </div>
        ";
    }
}