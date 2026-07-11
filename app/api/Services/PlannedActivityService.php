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

        $hasSla = !empty($data['sla_days']) && (int) $data['sla_days'] > 0;
        $includeSat = !empty($data['sla_include_saturday']);
        $includeSun = !empty($data['sla_include_sunday']);

        if ($existing) {
            $existingObs = $existing->notes ?? '';
            $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $auditEntry : $auditEntry;

            $this->repository->updatePlanningFields(
                $existing->id,
                $equipe,
                $newObs,
                $tipo,
                self::DEFAULT_STATUS
            );

            if ($hasSla) {
                $slaDays = (int) $data['sla_days'];
                $this->repository->updateSlaFields($existing->id, $slaDays, $includeSat ? 1 : 0, $includeSun ? 1 : 0);
            }

            $this->repository->addPlannedDate($existing->id, $dataPlanejada, $hasSla ? 1 : 0);

            if ($hasSla) {
                $slaDays = (int) $data['sla_days'];
                $slaDates = $this->generateSlaDates($dataPlanejada, $slaDays, $includeSat, $includeSun);
                $this->createSlaCards($existing->id, $slaDates, $tipo, $existing->id);
            }

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
            'sla_days' => $hasSla ? (int) $data['sla_days'] : null,
            'sla_include_saturday' => $includeSat,
            'sla_include_sunday' => $includeSun,
        ];

        $id = $this->repository->createFromPlanning($insertData, $auditEntry);

        if ($hasSla) {
            $this->repository->addPlannedDate($id, $dataPlanejada, 1);
            $slaDays = (int) $data['sla_days'];
            $slaDates = $this->generateSlaDates($dataPlanejada, $slaDays, $includeSat, $includeSun);
            $this->createSlaCards($id, $slaDates, $tipo, $id);
        } else {
            $this->repository->addPlannedDate($id, $dataPlanejada);
        }

        return ['action' => 'created', 'id' => $id];
    }

    /**
     * Generate dates for SLA cards, skipping weekends when disabled.
     * Day 1 is the start date. Returns array of [dateString, slaDayNumber].
     */
    private function generateSlaDates(string $startDate, int $slaDays, bool $includeSat, bool $includeSun): array
    {
        $dates = [];
        $current = new \DateTime($startDate);
        $dayNum = 1;

        while (count($dates) < $slaDays - 1) {
            $dow = (int) $current->format('N'); // 1=Mon,7=Sun
            $isSat = $dow === 6;
            $isSun = $dow === 7;

            if (($isSat && !$includeSat) || ($isSun && !$includeSun)) {
                $current->modify('+1 day');
                continue;
            }

            if ($dayNum > 1) {
                $dates[] = [$current->format('Y-m-d'), $dayNum];
            }

            $current->modify('+1 day');
            $dayNum++;
        }

        return $dates;
    }

    private function createSlaCards(int $parentId, array $slaDates, string $tipo, int $originalId): void
    {
        foreach ($slaDates as [$date, $dayNum]) {
            if ($tipo === 'preventiva') {
                $this->repository->createPreventivaSlaCard($originalId, $date, $dayNum);
            } else {
                $this->repository->addPlannedDate($parentId, $date, $dayNum);
            }
        }
    }

    public function extendSla(array $data): array
    {
        $id = (int) ($data['id'] ?? 0);
        $tipo = trim($data['tipo'] ?? 'corretiva');
        $extraDays = (int) ($data['extra_days'] ?? 0);
        $justification = trim($data['justification'] ?? '');

        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }
        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }
        if ($extraDays < 1 || $extraDays > 30) {
            throw new \RuntimeException('Dias extras deve ser entre 1 e 30.');
        }
        if ($justification === '') {
            throw new \RuntimeException('Justificativa é obrigatória.');
        }
        if (mb_strlen($justification) > 100) {
            throw new \RuntimeException('Justificativa deve ter no máximo 100 caracteres.');
        }

        // Get parent SLA config
        if ($tipo === 'preventiva') {
            $parent = $this->repository->getPreventivaById($id);
            if (!$parent) {
                throw new \RuntimeException('Atividade preventiva não encontrada.');
            }
            $includeSat = (bool) $parent['sla_include_saturday'];
            $includeSun = (bool) $parent['sla_include_sunday'];
            $slaDays = (int) ($parent['sla_days'] ?? 0);
            $lastDate = $parent['data_planejada'];
        } else {
            $parent = $this->repository->getById($id);
            if (!$parent) {
                throw new \RuntimeException('Registro não encontrado.');
            }
            $includeSat = (bool) ($parent->sla_include_saturday ?? false);
            $includeSun = (bool) ($parent->sla_include_sunday ?? false);
            $slaDays = (int) ($parent->sla_days ?? 0);
            $lastDate = $this->repository->getLastPlannedDate($id);
        }

        $slaDates = $this->generateSlaDatesForExtension($lastDate, $slaDays, $includeSat, $includeSun, $extraDays);

        $this->repository->addSlaExtension($id, $tipo, $extraDays, $justification);
        $this->createSlaCards($id, $slaDates, $tipo, $id);

        return ['action' => 'extended', 'extra_days' => $extraDays, 'cards_created' => count($slaDates)];
    }

    private function generateSlaDatesForExtension(string $lastDate, int $baseSlaDays, bool $includeSat, bool $includeSun, int $extraDays): array
    {
        $dates = [];
        $current = new \DateTime($lastDate);
        $current->modify('+1 day');
        $dayNum = $baseSlaDays + 1;

        while (count($dates) < $extraDays) {
            $dow = (int) $current->format('N');
            $isSat = $dow === 6;
            $isSun = $dow === 7;

            if (($isSat && !$includeSat) || ($isSun && !$includeSun)) {
                $current->modify('+1 day');
                continue;
            }

            $dates[] = [$current->format('Y-m-d'), $dayNum];

            $current->modify('+1 day');
            $dayNum++;
        }

        return $dates;
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

        $cleanStatus = trim($status);

        $allowedLower = array_map('mb_strtolower', self::ALLOWED_CORRETIVA_STATUSES);
        $idx = array_search(mb_strtolower($cleanStatus), $allowedLower, true);
        if ($idx === false) {
            throw new \RuntimeException('Status inválido.');
        }

        $cleanStatus = self::ALLOWED_CORRETIVA_STATUSES[$idx];

        $dataConcluido = null;
        if ($cleanStatus === 'Concluído') {
            $dataConcluido = date('Y-m-d');
        }

        $this->repository->updateCorretivaStatus($id, $cleanStatus, $dataConcluido);
        return ['action' => 'updated', 'id' => $id, 'status' => $cleanStatus];
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

    public function reorder(array $order, string $tipo, string $dataPlanejada): array
    {
        if (empty($order)) {
            throw new \RuntimeException('Ordem inválida.');
        }

        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        $this->repository->batchUpdateSortOrder($order, $tipo, $dataPlanejada);

        return ['action' => 'reordered'];
    }

    public function moveDate(int $id, string $tipo, string $sourceDate, string $targetDate): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }

        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $sourceDate)) {
            throw new \RuntimeException('Formato da data de origem inválido.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
            throw new \RuntimeException('Formato da data de destino inválido.');
        }

        if ($sourceDate === $targetDate) {
            throw new \RuntimeException('A data de destino deve ser diferente da data de origem.');
        }

        $this->repository->moveDate($id, $tipo, $sourceDate, $targetDate);

        return ['action' => 'moved'];
    }

    public function delete(int $id, ?string $dataPlanejada = null, ?int $slaDayNumber = null): array
    {
        $existing = $this->repository->getById($id);

        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        if ($existing->tipo !== 'corretiva') {
            $this->repository->delete($id);
            return ['action' => 'deleted'];
        }

        if ($dataPlanejada !== null) {
            if ($slaDayNumber !== null && (int) ($existing->sla_days ?? 0) > 0 && (int) $existing->sla_days === $slaDayNumber) {
                $this->repository->decrementCorretivaSlaDays($id);
            }

            $this->repository->removePlannedDate($id, $dataPlanejada);

            $remaining = $this->repository->countPlannedDates($id);
            if ($remaining === 0) {
                if ($existing->origin === self::DEFAULT_ORIGIN) {
                    $this->repository->delete($id, self::DEFAULT_ORIGIN);
                    return ['action' => 'deleted'];
                }
                $this->repository->unplan($id, self::UNPLAN_STATUS);
                return ['action' => 'unplanned'];
            }

            return ['action' => 'date_removed'];
        }

        $this->repository->removeAllPlannedDates($id);
        if ($existing->origin === self::DEFAULT_ORIGIN) {
            $this->repository->delete($id, self::DEFAULT_ORIGIN);
            return ['action' => 'deleted'];
        }
        $this->repository->unplan($id, self::UNPLAN_STATUS);
        return ['action' => 'unplanned'];
    }

    public function setSla(array $data): array
    {
        $id = (int) ($data['id'] ?? 0);
        $tipo = trim($data['tipo'] ?? 'corretiva');
        $slaDays = (int) ($data['sla_days'] ?? 0);
        $includeSat = !empty($data['sla_include_saturday']);
        $includeSun = !empty($data['sla_include_sunday']);

        if ($id <= 0) {
            throw new \RuntimeException('ID inválido.');
        }
        if (!in_array($tipo, ['preventiva', 'corretiva'], true)) {
            throw new \RuntimeException('Tipo inválido.');
        }
        if ($slaDays < 1 || $slaDays > 90) {
            throw new \RuntimeException('SLA deve ser entre 1 e 90 dias.');
        }

        if ($tipo === 'preventiva') {
            $existing = $this->repository->getPreventivaById($id);
            if (!$existing) {
                throw new \RuntimeException('Atividade não encontrada.');
            }
            if (!empty($existing['sla_days']) && (int) $existing['sla_days'] > 0) {
                throw new \RuntimeException('Card já possui SLA. Use Estender para adicionar dias.');
            }
            $dataPlanejada = $existing['data_planejada'];
        } else {
            $existing = $this->repository->getById($id);
            if (!$existing) {
                throw new \RuntimeException('Registro não encontrado.');
            }
            if (!empty($existing->sla_days) && (int) $existing->sla_days > 0) {
                throw new \RuntimeException('Registro já possui SLA. Use Estender para adicionar dias.');
            }
            $dataPlanejada = $existing->plannedDate ?? date('Y-m-d');
        }

        $this->repository->setSlaFields($id, $tipo, $slaDays, $includeSat ? 1 : 0, $includeSun ? 1 : 0);
        $this->repository->setCardDayNumber($id, $dataPlanejada, $tipo, 1);

        $slaDates = $this->generateSlaDates($dataPlanejada, $slaDays, $includeSat, $includeSun);
        $this->createSlaCards($id, $slaDates, $tipo, $id);

        return ['action' => 'sla_set', 'sla_days' => $slaDays, 'cards_created' => count($slaDates)];
    }
}
