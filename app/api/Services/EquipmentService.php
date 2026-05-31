<?php

namespace App\Api\Services;

use App\Api\Repositories\EquipmentRepository;
use App\Api\Repositories\TicketRepository;
use App\Api\Entities\Ticket;

class EquipmentService
{
    private EquipmentRepository $equipmentRepository;
    private TicketRepository $ticketRepository;

    public function __construct(
        ?EquipmentRepository $equipmentRepository = null,
        ?TicketRepository $ticketRepository = null
    ) {
        $this->equipmentRepository = $equipmentRepository ?? new EquipmentRepository();
        $this->ticketRepository = $ticketRepository ?? new TicketRepository();
    }

    public function listAll(int $limit = 20, int $offset = 0, string $search = '', ?string $location = null, ?string $exactName = null): array
    {
        $equipments = $this->equipmentRepository->listAll($limit, $offset, $search, $location, $exactName);

        $ids = array_map(fn($e) => $e->id, $equipments);
        $ticketsByEquipment = $this->ticketRepository->listByItems($ids, TicketService::STATUS_PRIORITY);
        $pendingPvsByEquipment = $this->equipmentRepository->getPendingPvCountByEquipmentIds($ids) ?? [];

        $items = [];
        foreach ($equipments as $e) {

            $item = $e->toArray();
            $tickets = $ticketsByEquipment[$e->id] ?? [];
            $pendingPv = $pendingPvsByEquipment[$e->id] ?? ['total' => 0, 'pvs' => ''];

            $hasProjetoCleanUp = false;
            $hasPlanned = false;
            $hasPending = false;
            $hasInProgress = false;

            foreach ($tickets as $r) {
                $status = strtolower(trim($r->status));

                if ($status === 'projeto clean up') {
                    $hasProjetoCleanUp = true;
                }

                if ($status === 'planejado') {
                    $hasPlanned = true;
                }

                if ($status === 'pendente') {
                    $hasPending = true;
                }

                if ($status === 'em andamento') {
                    $hasInProgress = true;
                }
            }

            $searchStatus = '';

            if ($hasProjetoCleanUp) {
                $searchStatus .= ' projeto clean up cleanup clean-up';
            }

            if ($hasPending) {
                $searchStatus .= ' pendente';
            }

            if ($hasPlanned) {
                $searchStatus .= ' planejado';
            }

            if ($hasInProgress) {
                $searchStatus .= ' em andamento';
            }

            $item['searchStatus'] = trim($searchStatus);

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

            $item['tickets'] = array_map(fn(Ticket $r) => $r->toArray(), $tickets);

            $item['pvs_pendentes_count'] = $pendingPv['total'];
            $item['pvs_pendentes'] = $pendingPv['pvs'];

            $items[] = $item;
        }

        return [
            'items' => $items,
            'total' => $this->equipmentRepository->count($search, $location, $exactName),
            'total_os' => $this->equipmentRepository->countOS($search),
        ];
    }

    public function hasChiller(string $location): bool
    {
        return $this->equipmentRepository->hasChiller($location);
    }
}
