<?php

namespace App\Api\Services;

use App\Api\Repositories\PlannedActivityRepository;

class PlannedActivityService
{
    private PlannedActivityRepository $repository;

    private const DEFAULT_STATUS = 'Planejado';
    private const UNPLAN_STATUS = 'Pendente';
    private const DEFAULT_ORIGIN = 'planning';
    private const DEFAULT_TIPO = 'preventiva';

    private const ALLOWED_CORRETIVA_STATUSES = [
        'Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up',
    ];

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
        if (strlen($os) > 20) {
            throw new \RuntimeException('OS deve ter no máximo 20 caracteres.');
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

        $tipo = trim($data['tipo'] ?? self::DEFAULT_TIPO);
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
                $tipo,
                self::DEFAULT_STATUS
            );

            return ['action' => 'updated', 'id' => $existing->id];
        }

        $insertData = [
            'os' => $os,
            'equipamento_id' => $equipamentoId,
            'data_planejada' => $dataPlanejada,
            'equipe' => $equipe,
            'material' => $material,
            'tipo' => $tipo,
            'status' => self::DEFAULT_STATUS,
            'origin' => self::DEFAULT_ORIGIN,
        ];

        $id = $this->repository->createFromPlanning($insertData, $auditEntry);

        return ['action' => 'created', 'id' => $id];
    }

    public function updateTeam(array $data): array
    {
        $id = (int) ($data['id'] ?? 0);
        $tipo = trim($data['tipo'] ?? 'corretiva');
        $equipe = trim($data['equipe'] ?? '');

        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }
        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }
        if ($equipe === '') {
            throw new \RuntimeException('Nome da equipe é obrigatório.');
        }
        if (mb_strlen($equipe) > 100) {
            throw new \RuntimeException('Nome da equipe muito longo (máx. 100 caracteres).');
        }

        $this->repository->updateTeam($id, $tipo, $equipe);
        return ['action' => 'updated', 'id' => $id];
    }

    public function updateObs(int $id, string $tipo, string $obs): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }
        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }
        if (mb_strlen($obs) > 1000) {
            throw new \RuntimeException('Observação deve ter no máximo 1000 caracteres.');
        }

        $this->repository->updateObs($id, $tipo, $obs);
        return ['action' => 'updated', 'id' => $id];
    }

    public function updateCorretivaStatus(int $id, string $status): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }

        $cleanStatus = mb_convert_case(trim($status), MB_CASE_TITLE, 'UTF-8');

        $allowedLower = array_map('mb_strtolower', self::ALLOWED_CORRETIVA_STATUSES);
        if (!in_array(mb_strtolower($cleanStatus), $allowedLower, true)) {
            throw new \RuntimeException('Status inválido.');
        }

        $dataConcluido = null;
        if ($cleanStatus === 'Concluído') {
            $dataConcluido = date('Y-m-d');
        }

        $this->repository->updateCorretivaStatus($id, $cleanStatus, $dataConcluido);
        return ['action' => 'updated', 'id' => $id];
    }

    public function duplicateDay(string $sourceDate, string $targetDate): array
    {
        if ($sourceDate === $targetDate) {
            throw new \RuntimeException('A data de destino deve ser diferente da data de origem.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $sourceDate)) {
            throw new \RuntimeException('Formato da data de origem inválido.');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
            throw new \RuntimeException('Formato da data de destino inválido.');
        }

        $items = $this->repository->findByDate($sourceDate);
        if (empty($items)) {
            throw new \RuntimeException('Nenhuma atividade encontrada na data de origem.');
        }

        $status = self::DEFAULT_STATUS; // 'Planejado'
        $origin = self::DEFAULT_ORIGIN; // 'planning'
        $count = 0;

        foreach ($items as $item) {
            if ($item['tipo'] === 'preventiva') {
                $this->repository->duplicatePreventivaToDate((int) $item['id'], $targetDate, $status);
            } else {
                $this->repository->duplicateCorretivaToDate((int) $item['id'], $targetDate, $status, $origin);
            }
            $count++;
        }

        return ['action' => 'duplicated', 'count' => $count];
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

        if ($existing->origin === self::DEFAULT_ORIGIN) {
            $this->repository->delete($id, self::DEFAULT_ORIGIN);
            return ['action' => 'deleted'];
        }

        $this->repository->unplan($id, self::UNPLAN_STATUS);
        return ['action' => 'unplanned'];
    }
}
