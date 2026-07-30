<?php

namespace App\Api\Services;

use App\Api\Repositories\TicketRepository;

class PendingTicketService
{
    private TicketRepository $repository;

    private const ALLOWED_STATUSES = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];

    public function __construct(?TicketRepository $repository = null)
    {
        $this->repository = $repository ?? new TicketRepository();
    }

    public function listPendingBySite(
        int $limit,
        ?string $lastLocal,
        ?int $lastId,
        string $search,
        string $status
    ): array {
        if ($status !== '' && !in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new \InvalidArgumentException('Status inválido: ' . $status);
        }

        $search = mb_strimwidth($search, 0, 200);

        $items = $this->repository->listPendingBySite($limit, $lastLocal, $lastId, $search, $status);
        $total = $this->repository->countPending($search, $status);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function countPending(string $search, string $status): int
    {
        if ($status !== '' && !in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new \InvalidArgumentException('Status inválido: ' . $status);
        }

        return $this->repository->countPending($search, $status);
    }
}
