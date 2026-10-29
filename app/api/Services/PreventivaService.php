<?php

namespace App\Api\Services;

use App\Api\Repositories\PreventivaRepository;

class PreventivaService
{
    private PreventivaRepository $repository;

    private const DEFAULT_STATUS = 'Planejado';

    private const ALLOWED_STATUS_TRANSITIONS = [
        'Planejado' => ['Em Andamento', 'Cancelado', 'Planejado'],
        'Em Andamento' => ['Em Andamento', 'Concluído', 'Cancelado', 'Planejado'],
        'Cancelado' => ['Planejado'],
        'Concluído' => ['Em Andamento', 'Planejado'],
    ];

    public function __construct(?PreventivaRepository $repository = null)
    {
        $this->repository = $repository ?? new PreventivaRepository();
    }

    private function enrichItem(?array $item): ?array
    {
        if (!$item || empty($item['sla_days'])) {
            return $item;
        }
        $groupId = !empty($item['sla_group_id']) ? (int) $item['sla_group_id'] : (int) ($item['id'] ?? 0);
        if ($groupId <= 0) {
            return $item;
        }
        $dayNumber = (int) ($item['sla_day_number'] ?? 0);
        try {
            if ($dayNumber > 0) {
                $sum = $this->repository->sumQtdForGroupUpToDay($groupId, $dayNumber);
            } else {
                $sum = $this->repository->sumQtdForGroup($groupId);
            }
        } catch (\Throwable $e) {
            $sum = 0;
        }
        $machineCount = (int) ($item['machine_count'] ?? $this->repository->countMachinesForSite($item['local'] ?? ''));
        if ($machineCount <= 0) {
            $machineCount = $this->repository->countMachinesForSite($item['local'] ?? '');
        }
        $restam = $machineCount > 0 ? max(0, $machineCount - $sum) : 0;
        $pct = $machineCount > 0
            ? (int) round(($sum / $machineCount) * 100)
            : (($sum > 0 && ($item['status'] ?? '') === 'Concluído') ? 100 : ($sum > 0 ? 50 : 0));
        $item['sla_feito'] = $sum;
        $item['sla_restam'] = $restam;
        $item['sla_pct'] = $pct;
        return $item;
    }

    private const ALLOWED_TIPOS = ['preventiva', 'adm'];

    /**
     * Status do tipo adm = ciclo Corretiva (sem matriz de transição).
     */
    private const ALLOWED_ADM_STATUSES = [
        'Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up',
    ];

    public function planPreventiva(array $data, array $currentUser): array
    {
        $tipo = mb_strtolower(trim((string) ($data['tipo'] ?? 'preventiva')));
        if ($tipo === '') {
            $tipo = 'preventiva';
        }

        if (!in_array($tipo, self::ALLOWED_TIPOS, true)) {
            throw new \RuntimeException('Tipo inválido. Use preventiva ou adm.');
        }

        $site = trim($data['site'] ?? '');
        $dataPlanejada = trim($data['data_planejada'] ?? '');
        $ticket = trim($data['ticket'] ?? '');
        $equipe = trim($data['equipe'] ?? '');
        $obs = trim($data['obs'] ?? '');

        if ($site === '') {
            throw new \RuntimeException('Site é obrigatório.');
        }

        if ($dataPlanejada === '') {
            throw new \RuntimeException('Data planejada é obrigatória.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        // Regra de negócio: preventiva exige site registrado (com equipamentos);
        // adm aceita texto livre (local interno/logístico).
        if ($tipo === 'preventiva' && $this->repository->countMachinesForSite($site) === 0) {
            throw new \RuntimeException('Site inválido. Selecione um site da lista.');
        }

        if ($equipe === '') {
            $equipe = 'A definir';
        }

        if (mb_strlen($obs) > 1000) {
            throw new \RuntimeException('Observação deve ter no máximo 1000 caracteres.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');
        $auditEntry = $obs !== ''
            ? "[{$now}] {$userName} ({$userRole}):\n{$obs}"
            : '';

        // Regra de negócio: adm nunca tem SLA (campos de SLA ignorados)
        $hasSla = $tipo !== 'adm' && !empty($data['sla_days']) && (int) $data['sla_days'] > 0;
        $includeSat = !empty($data['sla_include_saturday']);
        $includeSun = !empty($data['sla_include_sunday']);

        $record = [
            'site' => $site,
            'data_planejada' => $dataPlanejada,
            'ticket' => $ticket,
            'equipe' => $equipe,
            'obs' => $auditEntry,
            'tipo' => $tipo,
        ];

        if ($hasSla) {
            $record['sla_days'] = (int) $data['sla_days'];
            $record['sla_include_saturday'] = $includeSat;
            $record['sla_include_sunday'] = $includeSun;
            $record['sla_day_number'] = 1;
        }

        $id = $this->repository->create($record, self::DEFAULT_STATUS);

        if ($hasSla) {
            $this->repository->setSlaGroupId($id, $id);
            $slaDays = (int) $data['sla_days'];
            $slaDates = $this->generateSlaDates($dataPlanejada, $slaDays, $includeSat, $includeSun);
            foreach ($slaDates as [$date, $dayNum]) {
                $this->repository->createSlaCard($id, $date, $dayNum);
            }
            return ['action' => 'created', 'id' => $id, 'sla_days' => $slaDays, 'cards_created' => count($slaDates) + 1, 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
        }

        return ['action' => 'created', 'id' => $id, 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
    }

    private function generateSlaDates(string $startDate, int $slaDays, bool $includeSat, bool $includeSun): array
    {
        $dates = [];
        $current = new \DateTime($startDate);
        $dayNum = 1;

        while (count($dates) < $slaDays - 1) {
            $dow = (int) $current->format('N');
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

    private const STATUS_REQUIRE_QTD = ['Em Andamento', 'Concluído'];

    public function updateStatus(int $id, string $novoStatus, string $obs, array $currentUser, ?string $dataPlanejada = null, ?int $qtdExecutada = null): array
    {
        $record = $this->repository->getById($id);

        if (!$record) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $statusAtual = $record['status'];

        // Regra de negócio: adm usa o ciclo de status da corretiva, sem matriz de transição
        if (($record['tipo'] ?? 'preventiva') === 'adm') {
            return $this->updateAdmStatusWithinPreventiva($id, $novoStatus, $obs, $currentUser, $dataPlanejada, $record);
        }

        $transitions = self::ALLOWED_STATUS_TRANSITIONS[$statusAtual] ?? [];

        if (!in_array($novoStatus, $transitions, true)) {
            throw new \RuntimeException(
                "Transição inválida de '{$statusAtual}' para '{$novoStatus}'. " .
                "Permitidas: " . ($transitions ? implode(', ', $transitions) : 'nenhuma')
            );
        }

        // Regra de negócio: qtd_executada obrigatória para Em Andamento / Concluído
        $requiresQtd = in_array($novoStatus, self::STATUS_REQUIRE_QTD, true);
        $qtdToPersist = null;

        if ($requiresQtd) {
            if ($qtdExecutada === null) {
                throw new \RuntimeException('Informe a quantidade de máquinas preventivadas.');
            }
            if ($qtdExecutada < 0 || $qtdExecutada > 999) {
                throw new \RuntimeException('Quantidade deve estar entre 0 e 999.');
            }
            if ($qtdExecutada === 0) {
                $novoStatus = 'Planejado';
                $requiresQtd = false;
                $qtdToPersist = null;
            } else {
                $site = $record['site'] ?? '';
                $machineCount = $this->repository->countMachinesForSite($site);
                if ($machineCount > 0 && $qtdExecutada > $machineCount) {
                    throw new \RuntimeException("Quantidade não pode exceder {$machineCount} máquinas do site.");
                }
                // Validação acumulada do SLA (não estourar total do site)
                $groupId = !empty($record['sla_group_id']) ? (int) $record['sla_group_id'] : (int) $record['id'];
                if ($groupId > 0 && $machineCount > 0) {
                    $sumOthers = $this->repository->sumQtdForGroup($groupId, $id);
                    $total = $sumOthers + $qtdExecutada;
                    if ($total > $machineCount) {
                        $restam = $machineCount - $sumOthers;
                        $restam = max(0, $restam);
                        throw new \RuntimeException("Total do SLA ({$total}) excede {$machineCount} máquinas do site. Restam {$restam}.");
                    }
                }
                $qtdToPersist = $qtdExecutada;
            }
        } else {
            // Para Planejado/Cancelado limpa qtd (regra de negócio)
            $qtdToPersist = null;
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');

        $existingObs = $record['obs'] ?? '';
        $newEntry = "[{$now}] {$userName} ({$userRole}): Status alterado para '{$novoStatus}'";
        if ($requiresQtd && $qtdToPersist !== null) {
            $newEntry .= " ({$qtdToPersist} máquinas)";
        }
        if ($obs !== '') {
            $newEntry .= "\n{$obs}";
        }
        $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $newEntry : $newEntry;

        if ($dataPlanejada !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        $this->repository->updateStatus($id, $novoStatus, $newObs, $dataPlanejada, $qtdToPersist);

        $record = $this->repository->getById($id);
        return ['action' => 'status_updated', 'id' => $id, 'status' => $novoStatus, 'obs' => $record['obs'] ?? '', 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
    }

    private function updateAdmStatusWithinPreventiva(int $id, string $novoStatus, string $obs, array $currentUser, ?string $dataPlanejada, array $record): array
    {
        $allowedLower = array_map('mb_strtolower', self::ALLOWED_ADM_STATUSES);
        $idx = array_search(mb_strtolower($novoStatus), $allowedLower, true);
        if ($idx === false) {
            throw new \RuntimeException('Status inválido.');
        }
        $novoStatus = self::ALLOWED_ADM_STATUSES[$idx];

        if ($dataPlanejada !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');

        $existingObs = $record['obs'] ?? '';
        $newEntry = "[{$now}] {$userName} ({$userRole}): Status alterado para '{$novoStatus}'";
        if ($obs !== '') {
            $newEntry .= "\n{$obs}";
        }
        $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $newEntry : $newEntry;

        $this->repository->updateStatus($id, $novoStatus, $newObs, $dataPlanejada, null);

        $record = $this->repository->getById($id);
        return ['action' => 'status_updated', 'id' => $id, 'status' => $novoStatus, 'obs' => $record['obs'] ?? '', 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
    }

    public function updateQtd(int $id, int $qtdExecutada, array $currentUser = []): array
    {
        $record = $this->repository->getById($id);
        if (!$record) {
            throw new \RuntimeException('Registro não encontrado.');
        }
        $statusAtual = $record['status'] ?? '';
        if ($qtdExecutada < 0 || $qtdExecutada > 999) {
            throw new \RuntimeException('Quantidade deve estar entre 0 e 999.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');
        $existingObs = $record['obs'] ?? '';

        if ($qtdExecutada === 0) {
            // Reverter para 0 máquinas: limpa qtd e altera status para Planejado
            $entry = "[{$now}] {$userName} ({$userRole}): Quantidade revertida para 0. Status alterado para 'Planejado'";
            $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $entry : $entry;
            $this->repository->updateStatus($id, 'Planejado', $newObs, null, null);
            return ['action' => 'qtd_reverted', 'id' => $id, 'status' => 'Planejado', 'qtd_executada' => null, 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
        }

        if (!in_array($statusAtual, self::STATUS_REQUIRE_QTD, true)) {
            // Se estava Planejado e colocou > 0 máquinas, avança para Em Andamento
            $entry = "[{$now}] {$userName} ({$userRole}): Status alterado para 'Em Andamento' ({$qtdExecutada} máquinas)";
            $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $entry : $entry;
            $this->repository->updateStatus($id, 'Em Andamento', $newObs, null, $qtdExecutada);
            return ['action' => 'qtd_updated', 'id' => $id, 'status' => 'Em Andamento', 'qtd_executada' => $qtdExecutada, 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
        }

        $site = $record['site'] ?? '';
        $machineCount = $this->repository->countMachinesForSite($site);
        if ($machineCount > 0 && $qtdExecutada > $machineCount) {
            throw new \RuntimeException("Quantidade não pode exceder {$machineCount} máquinas do site.");
        }
        $groupId = !empty($record['sla_group_id']) ? (int) $record['sla_group_id'] : (int) $record['id'];
        if ($groupId > 0 && $machineCount > 0) {
            $sumOthers = $this->repository->sumQtdForGroup($groupId, $id);
            $total = $sumOthers + $qtdExecutada;
            if ($total > $machineCount) {
                $restam = $machineCount - $sumOthers;
                $restam = max(0, $restam);
                throw new \RuntimeException("Total do SLA ({$total}) excede {$machineCount} máquinas do site. Restam {$restam}.");
            }
        }

        $this->repository->updateQtd($id, $qtdExecutada);

        return ['action' => 'qtd_updated', 'id' => $id, 'qtd_executada' => $qtdExecutada, 'item' => $this->enrichItem($this->repository->getPreventivaItemById($id))];
    }

    public function delete(int $id): array
    {
        $record = $this->repository->getById($id);

        if (!$record) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $hasSla = !empty($record['sla_days']) && (int) $record['sla_days'] > 0;
        $groupId = !empty($record['sla_group_id']) ? (int) $record['sla_group_id'] : $id;

        $this->repository->delete($id);

        $slaReconciled = null;
        if ($hasSla) {
            $slaReconciled = $this->repository->reconcilePreventivaSlaGroup($groupId, $id);
        }

        return [
            'action' => 'deleted',
            'id' => $id,
            'tipo' => ($record['tipo'] ?? 'preventiva') !== '' ? ($record['tipo'] ?? 'preventiva') : 'preventiva',
            'sla_reconciled' => $slaReconciled,
        ];
    }

    public function importBatch(array $rows, array $currentUser): array
    {
        $grouped = [];
        $skippedInitial = 0;

        foreach ($rows as $row) {
            $site = trim((string) ($row['site'] ?? ''));
            $rawDate = trim((string) ($row['data'] ?? ''));

            if ($site === '' || $rawDate === '') {
                $skippedInitial++;
                continue;
            }

            $date = $this->normalizeDate($rawDate);
            if ($date === '') {
                $skippedInitial++;
                continue;
            }

            $rawTipo = mb_strtolower(trim((string) ($row['tipo'] ?? 'preventiva')));
            $tipo = str_contains($rawTipo, 'adm') ? 'adm' : 'preventiva';

            $groupKey = $site . '::' . $tipo;
            if (!isset($grouped[$groupKey])) {
                $grouped[$groupKey] = [
                    'site' => $site,
                    'tipo' => $tipo,
                    'dates' => [],
                ];
            }
            if (!in_array($date, $grouped[$groupKey]['dates'], true)) {
                $grouped[$groupKey]['dates'][] = $date;
            }
        }

        foreach ($grouped as &$grp) {
            sort($grp['dates']);
        }
        unset($grp);

        $res = $this->repository->importBatch(array_values($grouped));
        $res['skipped'] = (int) ($res['skipped'] ?? 0) + $skippedInitial;
        return $res;
    }

    private function normalizeDate(string $dateStr): string
    {
        $trimmed = trim($dateStr);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
            return $trimmed;
        }
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $trimmed, $m)) {
            return sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
        }
        return '';
    }
}
