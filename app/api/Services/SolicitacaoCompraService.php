<?php

namespace App\Api\Services;

class SolicitacaoCompraService
{
    public const STATUS_FLOW = [
        'em_cotacao',
        'orcamento_recebido',
        'sc_solicitada',
        'sc_aprovada',
        'pc_gerado',
        'material_retirado',
    ];

    public const STATUS_LABELS = [
        'em_cotacao' => 'Em cotação',
        'orcamento_recebido' => 'Orçamento recebido',
        'sc_solicitada' => 'SC solicitada',
        'sc_aprovada' => 'SC aprovada',
        'pc_gerado' => 'PC gerado',
        'material_retirado' => 'Material retirado',
    ];

    public static function statusIndex(?string $status): int
    {
        $index = array_search($status, self::STATUS_FLOW, true);

        return $index === false ? -1 : (int) $index;
    }

    /**
     * @return array<string, bool> chave do status => etapa já cumprida
     */
    public static function stepsFor(?string $status): array
    {
        $current = self::statusIndex($status);

        $steps = [];
        foreach (self::STATUS_FLOW as $index => $key) {
            $steps[$key] = $index <= $current;
        }

        return $steps;
    }

    /**
     * @return array{markup_pct: ?float, margem_pct: ?float}
     */
    public static function computeMargins(?float $valorSc, ?float $valorPv): array
    {
        $margins = ['markup_pct' => null, 'margem_pct' => null];

        if ($valorSc === null || $valorPv === null) {
            return $margins;
        }

        if ($valorSc > 0) {
            $margins['markup_pct'] = round((($valorPv - $valorSc) / $valorSc) * 100, 1);
        }

        if ($valorPv > 0) {
            $margins['margem_pct'] = round((($valorPv - $valorSc) / $valorPv) * 100, 1);
        }

        return $margins;
    }

    public static function overdueDays(array $row, string $today): int
    {
        $sla = $row['sla_dias'] ?? null;
        $dataStatus = $row['data_status'] ?? null;

        if ($sla === null || $sla === '' || $dataStatus === null || $dataStatus === '') {
            return 0;
        }

        $todayTs = strtotime($today);
        $statusTs = strtotime((string) $dataStatus);

        if ($todayTs === false || $statusTs === false) {
            return 0;
        }

        $days = (int) round(($todayTs - $statusTs) / 86400);
        $overdue = $days - (int) $sla;

        return $overdue > 0 ? $overdue : 0;
    }
}
