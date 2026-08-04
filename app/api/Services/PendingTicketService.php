<?php

namespace App\Api\Services;

use App\Api\Repositories\TicketRepository;

class PendingTicketService
{
    private TicketRepository $repository;

    private const ALLOWED_STATUSES = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];

    public const ALLOWED_SORT = [
        'e.local', 'e.localidade', 'e.equipamento', 'r.id', 'r.os', 'r.tipo',
        'r.status', 'r.data', 'r.data_planejada', 'r.data_real_inicio',
        'r.data_prevista_conclusao', 'r.data_concluido', 'r.equipe', 'r.material',
    ];

    public const ALLOWED_DIRS = ['ASC', 'DESC'];

    public const ALLOWED_EDITABLE_FIELDS = [
        'status', 'data', 'data_planejada', 'data_real_inicio',
        'data_prevista_conclusao', 'data_concluido', 'equipe', 'material',
    ];

    public function __construct(?TicketRepository $repository = null)
    {
        $this->repository = $repository ?? new TicketRepository();
    }

    public function listPendingBySite(
        int $limit,
        int $offset = 0,
        string $search = '',
        string $status = '',
        string $sortBy = 'e.local',
        string $sortDir = 'ASC'
    ): array {
        if ($status !== '' && !in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new \InvalidArgumentException('Status inválido: ' . $status);
        }

        $sortBy = in_array($sortBy, self::ALLOWED_SORT, true) ? $sortBy : 'e.local';
        $sortDir = in_array(strtoupper($sortDir), self::ALLOWED_DIRS, true) ? strtoupper($sortDir) : 'ASC';

        $search = mb_strimwidth($search, 0, 200);

        $items = $this->repository->listPendingBySite($limit, max(0, $offset), $search, $status, $sortBy, $sortDir);
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

    public function updatePendingField(int $id, string $field, mixed $value): bool
    {
        if (!in_array($field, self::ALLOWED_EDITABLE_FIELDS, true)) {
            throw new \InvalidArgumentException('Campo não editável: ' . $field);
        }

        if ($field === 'status') {
            $status = mb_strtolower((string) $value, 'UTF-8');
            if (!in_array($status, self::ALLOWED_STATUSES, true)) {
                throw new \InvalidArgumentException('Status inválido: ' . $value);
            }
            $value = $status;
        }

        if (is_string($value)) {
            $value = trim($value);
        }

        if ($field !== 'status' && ($value === '' || $value === null)) {
            $value = null;
        }

        return $this->repository->updatePendingField($id, $field, $value);
    }
}
