<?php

namespace App\Api\Services;

use App\Api\Repositories\PlannedActivityRepository;

class PlannedActivityService
{
    private PlannedActivityRepository $repository;

    public function __construct(?PlannedActivityRepository $repository = null)
    {
        $this->repository = $repository ?? new PlannedActivityRepository();
    }

    public function listAll(int $limit, int $offset, string $search, ?string $dateFrom = null, ?string $dateTo = null, ?string $status = null): array
    {
        $items = $this->repository->listAll($limit, $offset, $search, $dateFrom, $dateTo, $status);
        $total = $this->repository->count($search, $dateFrom, $dateTo, $status);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function planActivity(array $data, array $currentUser): array
    {
        $os = trim($data['os'] ?? '');
        $equipamentoId = (int) ($data['equipamento_id'] ?? 0);
        $dataPlanejada = trim($data['data_planejada'] ?? '');
        $equipe = trim($data['equipe'] ?? '');
        $material = trim($data['material'] ?? '');
        $obs = trim($data['obs'] ?? '');

        if ($os === '' || !preg_match('/^[a-zA-Z0-9]+$/', $os)) {
            throw new \RuntimeException('Formato de OS inválido. Use apenas letras e números.');
        }

        if ($equipamentoId <= 0) {
            throw new \RuntimeException('Equipamento obrigatório.');
        }

        if ($dataPlanejada === '') {
            throw new \RuntimeException('Data planejada é obrigatória.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        if ($equipe === '') {
            $equipe = 'A definir';
        }

        if ($material === '') {
            $material = 'Sim';
        }

        if (mb_strlen($obs) > 1000) {
            throw new \RuntimeException('Observação deve ter no máximo 1000 caracteres.');
        }

        $tipo = trim($data['tipo'] ?? 'preventiva');
        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido. Use preventiva ou corretiva.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');
        $auditEntry = "[{$now}] {$userName} ({$userRole}):\n{$obs}";

        $existing = $this->repository->findByOsAndEquipment($os, $equipamentoId);

        if ($existing) {
            $existingObs = $existing->notes ?? '';
            $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $auditEntry : $auditEntry;

            $this->repository->updateToPlanned(
                $existing->id,
                $dataPlanejada,
                $equipe,
                $newObs,
                $tipo
            );

            return ['action' => 'updated', 'id' => $existing->id];
        }

        $data['os'] = $os;
        $data['equipamento_id'] = $equipamentoId;
        $data['data_planejada'] = $dataPlanejada;
        $data['equipe'] = $equipe;
        $data['material'] = $material;
        $data['tipo'] = $tipo;

        $id = $this->repository->createFromPlanning($data, $auditEntry);

        return ['action' => 'created', 'id' => $id];
    }

    public function delete(int $id): array
    {
        $existing = $this->repository->getById($id);

        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        if ($existing->plannedDate === null) {
            throw new \RuntimeException('Registro não possui data planejada.');
        }

        if ($existing->origin === 'planning') {
            $this->repository->delete($id);
            return ['action' => 'deleted'];
        }

        $this->repository->unplan($id);
        return ['action' => 'unplanned'];
    }
}
