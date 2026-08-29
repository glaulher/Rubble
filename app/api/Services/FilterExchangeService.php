<?php

namespace App\Api\Services;

use App\Api\Repositories\FilterExchangeRepository;
use App\Api\Repositories\EquipmentRepository;

class FilterExchangeService
{
    private FilterExchangeRepository $repository;
    private TicketService $ticketService;
    private EquipmentRepository $equipmentRepository;

    private const ALLOWED_STATUSES = ['pendente', 'planejado', 'concluído'];

    public const ALLOWED_SORT = [
        'f.local', 'f.equipamento', 'f.uf', 'f.regiao', 'f.tamanho', 'f.qtd',
        'f.os', 'f.data_troca', 'f.data_proxima_troca', 'f.intervalo_meses',
    ];

    public const ALLOWED_DIRS = ['ASC', 'DESC'];

    private const ALLOWED_EDITABLE_FIELDS = [
        'local', 'equipamento', 'uf', 'regiao', 'tamanho', 'qtd', 'os',
        'data_troca', 'data_proxima_troca', 'intervalo_meses',
    ];

    private const ADMIN_ONLY_FIELDS = ['tamanho', 'qtd'];

    public function __construct(
        ?FilterExchangeRepository $repository = null,
        ?TicketService $ticketService = null,
        ?EquipmentRepository $equipmentRepository = null
    ) {
        $this->repository = $repository ?? new FilterExchangeRepository();
        $this->ticketService = $ticketService ?? new TicketService();
        $this->equipmentRepository = $equipmentRepository ?? new EquipmentRepository();
    }

    public function computeNextDate(?string $dataTroca, int $meses = 4): ?string
    {
        if ($dataTroca === null || trim($dataTroca) === '') {
            return null;
        }
        $dt = \DateTime::createFromFormat('Y-m-d', $dataTroca);
        if (!$dt) {
            return null;
        }
        if ($meses < 1 || $meses > 12) {
            throw new \InvalidArgumentException('Intervalo deve estar entre 1 e 12 meses');
        }
        $dt->modify('+' . $meses . ' months');
        return $dt->format('Y-m-d');
    }

    public function computeStatus(?string $dataProximaTroca): string
    {
        if ($dataProximaTroca === null || trim($dataProximaTroca) === '') {
            return 'pendente';
        }

        $today = new \DateTime('today');
        $next = \DateTime::createFromFormat('Y-m-d', $dataProximaTroca);
        if (!$next) {
            return 'pendente';
        }
        $next->setTime(0, 0);

        if ($next <= $today) {
            return 'pendente';
        }

        $horizon = clone $today;
        $horizon->modify('+2 months');
        if ($next <= $horizon) {
            return 'planejado';
        }

        return 'concluído';
    }

    public function listAll(
        int $limit,
        int $offset = 0,
        string $search = '',
        string $status = '',
        string $sortBy = 'f.local',
        string $sortDir = 'ASC'
    ): array {
        if ($status !== '' && !in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new \InvalidArgumentException('Status inválido: ' . $status);
        }

        $sortBy = in_array($sortBy, self::ALLOWED_SORT, true) ? $sortBy : 'f.local';
        $sortDir = in_array(strtoupper($sortDir), self::ALLOWED_DIRS, true) ? strtoupper($sortDir) : 'ASC';

        $search = mb_strimwidth($search, 0, 200);

        $items = $this->repository->listAll($limit, max(0, $offset), $search, $status, $sortBy, $sortDir);
        $total = $this->repository->count($search, $status);
        $totalQtd = $this->repository->sumQtd($search, $status);

        foreach ($items as &$item) {
            $item['status'] = $this->computeStatus($item['data_proxima_troca'] ?? null);
        }
        unset($item);

        return [
            'items' => $items,
            'total' => $total,
            'total_qtd' => $totalQtd,
        ];
    }

    public function count(string $search = '', string $status = ''): int
    {
        if ($status !== '' && !in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new \InvalidArgumentException('Status inválido: ' . $status);
        }

        return $this->repository->count($search, $status);
    }

    public function create(string $local, string $equipamento, string $uf, string $regiao, string $tamanho, int $qtd): bool
    {
        if (trim($local) === '' || trim($equipamento) === '') {
            throw new \InvalidArgumentException('Local e equipamento são obrigatórios');
        }
        if (strlen($uf) !== 2) {
            throw new \InvalidArgumentException('UF deve ter 2 caracteres');
        }
        if ($qtd <= 0) {
            throw new \InvalidArgumentException('Quantidade deve ser maior que zero');
        }

        return $this->repository->create([
            'local' => $local,
            'equipamento' => $equipamento,
            'uf' => strtoupper($uf),
            'regiao' => $regiao,
            'tamanho' => $tamanho,
            'qtd' => $qtd,
        ]);
    }

    public function updateField(int $id, string $field, $value, ?object $user = null): bool
    {
        if (!in_array($field, self::ALLOWED_EDITABLE_FIELDS, true)) {
            throw new \InvalidArgumentException('Campo inválido: ' . $field);
        }

        if (in_array($field, self::ADMIN_ONLY_FIELDS, true)) {
            $role = $user->role ?? '';
            if ($role !== 'admin') {
                throw new \InvalidArgumentException('Apenas administradores podem editar tamanho e quantidade');
            }
        }

        if ($field === 'data_troca') {
            $value = ($value === null || trim((string) $value) === '') ? null : (string) $value;
            $next = $this->computeNextDate($value, 4);

            $this->repository->updateField($id, 'data_troca', $value);
            $this->repository->updateField($id, 'intervalo_meses', 4);
            return $this->repository->updateField($id, 'data_proxima_troca', $next);
        }

        if ($field === 'intervalo_meses') {
            $meses = (int) $value;
            if ($meses < 1 || $meses > 12) {
                throw new \InvalidArgumentException('Intervalo deve estar entre 1 e 12 meses');
            }
            $this->repository->updateField($id, 'intervalo_meses', $meses);
            $row = $this->repository->getById($id);
            $dataTroca = $row['data_troca'] ?? null;
            $next = $this->computeNextDate($dataTroca, $meses);
            return $this->repository->updateField($id, 'data_proxima_troca', $next);
        }

        if ($field === 'os') {
            $value = trim((string) $value);
            $this->ensureOsTickets($id, $value);

            return $this->repository->updateField($id, 'os', $value === '' ? null : $value);
        }

        if ($field === 'qtd') {
            $value = (int) $value;
        }

        return $this->repository->updateField($id, $field, $value);
    }

    public function delete(int $id, ?object $user = null): bool
    {
        if ($user !== null) {
            $role = $user->role ?? '';
            if ($role !== 'admin') {
                throw new \InvalidArgumentException('Apenas administradores podem excluir registros de filtro');
            }
        }

        return $this->repository->delete($id);
    }

    private function ensureOsTickets(int $id, string $os): void
    {
        if ($os === '') {
            return;
        }

        if (!preg_match('/^[a-zA-Z0-9]+$/', $os)) {
            throw new \InvalidArgumentException('Formato de OS inválido. Use apenas letras e números.');
        }
        if (strlen($os) > 20) {
            throw new \InvalidArgumentException('OS deve ter no máximo 20 caracteres.');
        }

        if ($this->ticketService->findByOs($os) !== null) {
            return;
        }

        $row = $this->repository->getById($id);
        if ($row === null) {
            return;
        }

        $equipments = $this->equipmentRepository->findByLocalScmAndName($row['local'] ?? '', $row['equipamento'] ?? '');
        foreach ($equipments as $equipment) {
            $this->ticketService->save([
                'equipamento_id' => (int) $equipment['id'],
                'os' => $os,
                'data' => $row['data_troca'] ?? null,
                'equipe' => 'A definir',
                'status' => 'Concluído',
                'data_concluido' => date('Y-m-d'),
                'material' => 'Sim',
                'obs' => 'Troca de filtro registrada automaticamente pela tela Troca de Filtros.',
            ]);
        }
    }
}
