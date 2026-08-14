<?php

namespace App\Api\Services;

use App\Api\Repositories\TicketRepository;

class PendingTicketService
{
    private TicketRepository $repository;

    private const ALLOWED_STATUSES = ['pendente', 'planejado', 'em andamento', 'projeto clean up', 'concluido', 'concluído'];

    private const ALLOWED_PRIORITIES = ['0', '0-A', '0-B', '0-C', '0-D', '0-E', '1', '3', '4', '5'];

    private const EXCLUDED_LOCATION = 'Fornecimento';

    public const ALLOWED_SORT = [
        'e.local', 'e.localidade', 'e.equipamento', 'r.id', 'r.os', 'r.tipo',
        'r.status', 'r.prioridade', 'r.data', 'r.data_planejada', 'r.data_real_inicio',
        'r.data_prevista_conclusao', 'r.data_concluido', 'r.equipe', 'r.material',
    ];

    public const ALLOWED_DIRS = ['ASC', 'DESC'];

    public const ALLOWED_EDITABLE_FIELDS = [
        'status', 'prioridade', 'data', 'data_planejada', 'data_real_inicio',
        'data_prevista_conclusao', 'data_concluido', 'equipe', 'material', 'obs',
    ];

    public function __construct(?TicketRepository $repository = null)
    {
        $this->repository = $repository ?? new TicketRepository();
    }

    /**
     * @return string[]
     */
    private function parseStatuses(string $status): array
    {
        if ($status === '') {
            return [];
        }

        $parts = array_filter(array_map('trim', explode(',', $status)), static fn(string $s): bool => $s !== '');
        $statuses = [];
        foreach ($parts as $part) {
            $normalized = mb_strtolower($part, 'UTF-8');
            if (!in_array($normalized, self::ALLOWED_STATUSES, true)) {
                throw new \InvalidArgumentException('Status inválido: ' . $part);
            }
            $statuses[] = $normalized;
        }

        return $statuses;
    }

    public function listPendingBySite(
        int $limit,
        int $offset = 0,
        string $search = '',
        string $status = '',
        string $sortBy = 'e.local',
        string $sortDir = 'ASC',
        string $os = ''
    ): array {
        $statuses = $this->parseStatuses($status);

        $sortBy = in_array($sortBy, self::ALLOWED_SORT, true) ? $sortBy : 'e.local';
        $sortDir = in_array(strtoupper($sortDir), self::ALLOWED_DIRS, true) ? strtoupper($sortDir) : 'ASC';

        $search = mb_strimwidth($search, 0, 200);
        $os = mb_strimwidth($os, 0, 200);

        $items = $this->repository->listPendingBySite($limit, max(0, $offset), $search, $statuses, $sortBy, $sortDir, $os, self::EXCLUDED_LOCATION);
        $total = $this->repository->countPending($search, $statuses, $os, self::EXCLUDED_LOCATION);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function countPending(string $search, string $status, string $os = ''): int
    {
        $statuses = $this->parseStatuses($status);

        return $this->repository->countPending($search, $statuses, $os, self::EXCLUDED_LOCATION);
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

        if ($field === 'prioridade') {
            $priority = strtoupper((string) $value);
            if (!in_array($priority, self::ALLOWED_PRIORITIES, true)) {
                throw new \InvalidArgumentException('Prioridade inválida: ' . $value);
            }
            $value = $priority;
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
