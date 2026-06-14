<?php

namespace App\Api\Services;

use App\Api\Repositories\EquipmentRepository;
use App\Api\Repositories\EquipmentPriceRepository;
use App\Api\Repositories\TicketRepository;

class EquipmentService
{
    private EquipmentRepository $equipmentRepository;
    private TicketRepository $ticketRepository;
    private EquipmentPriceRepository $priceRepository;

    public function __construct(
        ?EquipmentRepository $equipmentRepository = null,
        ?TicketRepository $ticketRepository = null,
        ?EquipmentPriceRepository $priceRepository = null
    ) {
        $this->equipmentRepository = $equipmentRepository ?? new EquipmentRepository();
        $this->ticketRepository = $ticketRepository ?? new TicketRepository();
        $this->priceRepository = $priceRepository ?? new EquipmentPriceRepository();
    }

    public function listAll(int $limit = 20, ?array $keyset = null, string $search = '', ?string $location = null, ?string $exactName = null): array
    {
        $equipments = $this->equipmentRepository->listAll($limit, $keyset, $search, $location, $exactName);

        $ids = array_map(fn($e) => $e->id, $equipments);
        $ticketSummary = $this->ticketRepository->listTicketSummaryByEquipmentIds($ids);
        $pendingPvsByEquipment = $this->equipmentRepository->getPendingPvCountByEquipmentIds($ids) ?? [];
        $priceRules = $this->priceRepository->getActiveRules();

        $items = [];
        foreach ($equipments as $e) {

            $item = $e->toArray();
            $summary = $ticketSummary[$e->id] ?? null;
            $pendingPv = $pendingPvsByEquipment[$e->id] ?? ['total' => 0, 'pvs' => ''];

            $item['searchStatus'] = $summary['searchStatus'] ?? '';
            $item['tickets_count'] = $summary['total'] ?? 0;

            $hasProjetoCleanUp = ($summary['projeto_clean_up'] ?? 0) > 0;
            $hasPlanned = ($summary['planejado'] ?? 0) > 0;
            $hasPending = ($summary['pendente'] ?? 0) > 0;
            $hasInProgress = ($summary['em_andamento'] ?? 0) > 0;

            if ($hasProjetoCleanUp) {
                $item['color'] = 'bg-purple-100 text-purple-800';
                $item['icon'] = '🧹';
            } elseif ($hasPlanned) {
                $item['color'] = 'bg-yellow-100 text-yellow-800';
                $item['icon'] = '🕒';
            } elseif ($hasPending) {
                $item['color'] = 'bg-red-100 text-red-800';
                $item['icon'] = '⚠️';
            } elseif ($hasInProgress) {
                $item['color'] = 'bg-blue-100 text-blue-800';
                $item['icon'] = '🛠️';
            } else {
                $item['color'] = '';
                $item['icon'] = '';
            }

            $item['pvs_pendentes_count'] = $pendingPv['total'];
            $item['pvs_pendentes'] = $pendingPv['pvs'];

            $item['valor_tr'] = $this->priceRepository->resolvePrice(
                $e->equipment,
                $e->location,
                $e->capacity,
                $priceRules,
                $e->mercado
            );

            $items[] = $item;
        }

        return [
            'items' => $items,
            'total' => $this->equipmentRepository->count($search, $location, $exactName),
            'total_os' => $this->equipmentRepository->countOS($search),
            'total_valor' => $this->priceRepository->sumValueByFilter($search, $location),
        ];
    }

    public function hasChiller(string $location): bool
    {
        return $this->equipmentRepository->hasChiller($location);
    }
}
