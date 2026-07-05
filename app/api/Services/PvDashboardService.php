<?php

namespace App\Api\Services;

use App\Api\Repositories\PvDashboardRepository;

class PvDashboardService
{
    public const FATURADO_STATUS = 'SCM aprovado';
    public const PREVISAO_EXCLUDE_STATUSES = ['SCM aprovado', 'Cancelado'];
    public const APPROVED_STATUS = 'SCM aprovado';
    public const MATERIAL_LPU_ORIGINS = ['lpu_material_clima', 'lpu_material_chiller'];
    public const SERVICE_LPU_ORIGINS = ['lpu_servico_clima', 'lpu_servico_chiller', 'lpu_civil'];

    private PvDashboardRepository $repository;

    private const STATUS_GROUPS = [
        'scm_aprovado' => [
            'label' => 'SCM Aprovado',
            'statuses' => ['SCM aprovado'],
            'type' => 'value',
        ],
        'cancelados_negados' => [
            'label' => 'Cancelados / Negados',
            'statuses' => ['Cancelado', 'SCM negado'],
            'type' => 'value',
        ],
        'aprovado_exec_aquisicao' => [
            'label' => 'Aprovado Exec./Aquisição',
            'statuses' => ['Aprovado aquisição/serviço', 'Aprovado serv.', 'SCM enviado', 'aprovado compr.'],
            'type' => 'value',
        ],
        'sem_aprovacao' => [
            'label' => 'Sem Aprovação',
            'statuses' => [
                'Aguardando envio',
                'E-mail de lib. aquisição/serviço',
                'E-mail de aprov. serv. realizado',
                'E-mail de aprov. serv.',
                'E-mail de lib. compr.',
            ],
            'type' => 'value',
        ],
    ];

    public function __construct(?PvDashboardRepository $repository = null)
    {
        $this->repository = $repository ?? new PvDashboardRepository();
    }

    public function getStats(?string $periodStart = null, ?string $periodEnd = null, ?string $location = null, ?string $statusGroup = null): array
    {
        $statusCounts = $this->repository->statusCounts($periodStart, $periodEnd, $location);
        $financialByMonth = $this->repository->financialByMonth(
            $periodStart, $periodEnd, $location,
            self::FATURADO_STATUS, self::PREVISAO_EXCLUDE_STATUSES
        );
        $topLocations = $this->repository->topLocations(
            $periodStart, $periodEnd, $location,
            self::APPROVED_STATUS
        );
        $topMaterials = $this->repository->topMaterials(
            $periodStart, $periodEnd, $location,
            self::MATERIAL_LPU_ORIGINS
        );
        $topServices = $this->repository->topServices(
            $periodStart, $periodEnd, $location,
            self::SERVICE_LPU_ORIGINS
        );
        $topEquipment = $this->repository->topEquipment($periodStart, $periodEnd, $location);
        $pvByMonth = $this->repository->pvByMonth($periodStart, $periodEnd, $location);
        $locations = $this->repository->listLocations();

        $realTotalCount = $this->repository->totalPvCount($periodStart, $periodEnd, $location);
        $realTotalValue = $this->repository->totalPvValue($periodStart, $periodEnd, $location);

        $statusMap = [];
        foreach ($statusCounts as $s) {
            $statusMap[strtolower($s['status'])] = [
                'count' => (int) $s['count'],
                'value' => (float) $s['totalValue'],
            ];
        }

        $breakdown = [];

        foreach (self::STATUS_GROUPS as $key => $group) {
            $count = 0;
            $value = 0;
            foreach ($group['statuses'] as $st) {
                $lookupKey = strtolower($st);
                if (isset($statusMap[$lookupKey])) {
                    $count += $statusMap[$lookupKey]['count'];
                    $value += $statusMap[$lookupKey]['value'];
                }
            }
            $breakdown[] = [
                'key' => $key,
                'label' => $group['label'],
                'value' => $value,
                'count' => $count,
                'type' => $group['type'],
            ];
        }

        $breakdown[] = [
            'key' => 'total_geral',
            'label' => 'Total Geral PVs',
            'value' => $realTotalValue,
            'count' => $realTotalCount,
            'type' => 'value',
        ];

        $totalFaturado = 0;
        $totalPrevisao = 0;
        foreach ($breakdown as $b) {
            if ($b['key'] === 'scm_aprovado') {
                $totalFaturado += $b['value'];
            } elseif ($b['key'] === 'aprovado_exec_aquisicao' || $b['key'] === 'sem_aprovacao') {
                $totalPrevisao += $b['value'];
            }
        }

        return [
            'statusBreakdown' => $breakdown,
            'statusTotalPvCount' => $realTotalCount,
            'statusTotalValue' => $realTotalValue,
            'totals' => [
                'totalPvCount' => $realTotalCount,
                'totalFaturado' => $totalFaturado,
                'totalPrevisao' => $totalPrevisao,
            ],
            'financialByMonth' => $financialByMonth,
            'topLocations' => $topLocations,
            'topMaterials' => $topMaterials,
            'topServices' => $topServices,
            'topEquipment' => $topEquipment,
            'pvByMonth' => $pvByMonth,
            'locations' => $locations,
        ];
    }
}
