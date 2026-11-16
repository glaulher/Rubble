<?php

declare(strict_types=1);

namespace App\Api\Services;

use App\Api\Repositories\DiarioRepository;

class DiarioService
{
    public const STATUS_OPTIONS = [
        'Concluído',
        'Pendente',
        'Em andamento',
        'Planejado',
        'Projeto Clean up',
        'Cancelado',
    ];

    public const CATEGORY_OPTIONS = [
        'corretiva',
        'preventiva',
        'emergencial',
        'administrativa',
    ];

    public const ALLOWED_SORT = [
        'id', 'site', 'equipamento', 'equipamento_id', 'equipamento_nome',
        'localidade', 'os', 'data', 'hora_inicio', 'hora_saida', 'categoria', 'status', 'equipe', 'tecnico', 'placa', 'obs', 'created_at', 'created_by',
        'd.id', 'd.site', 'd.localidade', 'd.os', 'd.data', 'd.hora_inicio', 'd.hora_saida', 'd.categoria',
        'd.status', 'd.equipe', 'd.tecnico', 'd.placa', 'd.obs', 'd.created_at', 'e.equipamento', 'created_by_name'
    ];

    public const ALLOWED_DIRS = ['ASC', 'DESC'];

    public const ALLOWED_FIELDS = [
        'site', 'equipamento_id', 'localidade', 'os', 'data', 'hora_inicio', 'hora_saida', 'categoria', 'status', 'equipe', 'tecnico', 'placa'
    ];

    private DiarioRepository $repository;
    private ?\App\Api\Repositories\TeamRepository $teamRepository;

    public function __construct(
        ?DiarioRepository $repository = null,
        ?\App\Api\Repositories\TeamRepository $teamRepository = null
    ) {
        $this->repository = $repository ?? new DiarioRepository();
        $this->teamRepository = $teamRepository;
    }

    public function listAll(
        array $filters = [],
        int $limit = 20,
        int $offset = 0,
        string $sortBy = 'd.data',
        string $sortDir = 'DESC'
    ): array {
        if (!in_array($sortBy, self::ALLOWED_SORT, true)) {
            $sortBy = 'd.data';
        }
        if (!in_array(strtoupper($sortDir), self::ALLOWED_DIRS, true)) {
            $sortDir = 'DESC';
        }

        $items = $this->repository->list($filters, $limit, $offset, $sortBy, $sortDir);
        $total = $this->repository->count($filters);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function getById(int $id): ?array
    {
        $entity = $this->repository->findById($id);
        return $entity ? $entity->toArray() : null;
    }

    public function create(array $data, array $currentUser): array
    {
        $userId = isset($currentUser['id']) ? (int) $currentUser['id'] : null;

        $rawObs = !empty($data['obs']) ? trim((string) $data['obs']) : (!empty($data['nova_obs']) ? trim((string) $data['nova_obs']) : null);
        if ($rawObs !== null && $rawObs !== '') {
            if (!str_starts_with($rawObs, '[')) {
                $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
                $userRole = $currentUser['role'] ?? '';
                $now = date('d/m/Y H:i');
                $rawObs = "[{$now}] {$userName} ({$userRole}): {$rawObs}";
            }
        } else {
            $rawObs = null;
        }

        $record = [
            'site' => !empty($data['site']) ? trim((string) $data['site']) : null,
            'equipamento_id' => isset($data['equipamento_id']) && $data['equipamento_id'] !== '' && $data['equipamento_id'] !== 'N/A'
                ? (int) $data['equipamento_id']
                : null,
            'localidade' => !empty($data['localidade']) && $data['localidade'] !== 'N/A' ? trim((string) $data['localidade']) : null,
            'os' => !empty($data['os']) && $data['os'] !== 'N/A' ? trim((string) $data['os']) : null,
            'data' => !empty($data['data']) ? trim((string) $data['data']) : date('Y-m-d'),
            'hora_inicio' => !empty($data['hora_inicio']) && $data['hora_inicio'] !== 'N/A' ? trim((string) $data['hora_inicio']) : null,
            'hora_saida' => !empty($data['hora_saida']) && $data['hora_saida'] !== 'N/A' ? trim((string) $data['hora_saida']) : null,
            'categoria' => !empty($data['categoria']) ? trim((string) $data['categoria']) : null,
            'status' => !empty($data['status']) ? trim((string) $data['status']) : null,
            'equipe' => !empty($data['equipe']) && $data['equipe'] !== 'N/A' ? trim((string) $data['equipe']) : null,
            'tecnico' => !empty($data['tecnico']) && $data['tecnico'] !== 'N/A' ? trim((string) $data['tecnico']) : null,
            'placa' => !empty($data['placa']) && $data['placa'] !== 'N/A' ? trim((string) $data['placa']) : null,
            'obs' => $rawObs,
        ];

        $this->autoResolveTeamData($record);

        if ($record['data'] !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $record['data'])) {
            throw new \InvalidArgumentException('Formato de data inválido. Use YYYY-MM-DD.');
        }

        if ($record['hora_inicio'] !== null && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $record['hora_inicio'])) {
            throw new \InvalidArgumentException('Formato de hora de início inválido. Use HH:MM.');
        }

        if ($record['hora_saida'] !== null && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $record['hora_saida'])) {
            throw new \InvalidArgumentException('Formato de hora de saída inválido. Use HH:MM.');
        }

        if ($record['categoria'] !== null && !in_array($record['categoria'], self::CATEGORY_OPTIONS, true)) {
            throw new \InvalidArgumentException('Categoria inválida.');
        }

        if ($record['status'] !== null && !in_array($record['status'], self::STATUS_OPTIONS, true)) {
            throw new \InvalidArgumentException('Status inválido.');
        }

        if ($record['equipe'] !== null && mb_strlen($record['equipe']) > 100) {
            throw new \InvalidArgumentException('Equipe deve ter no máximo 100 caracteres.');
        }

        if ($record['tecnico'] !== null && mb_strlen($record['tecnico']) > 100) {
            throw new \InvalidArgumentException('Técnico deve ter no máximo 100 caracteres.');
        }

        if ($record['placa'] !== null && mb_strlen($record['placa']) > 30) {
            throw new \InvalidArgumentException('Placa deve ter no máximo 30 caracteres.');
        }

        $id = $this->repository->create($record, $userId);
        if ($id <= 0) {
            throw new \RuntimeException('Erro ao criar registro no diário de atividades.');
        }

        $item = $this->repository->findById($id);
        return [
            'id' => $id,
            'item' => $item ? $item->toArray() : null,
        ];
    }

    public function updateField(int $id, string $field, mixed $value): array
    {
        if (!in_array($field, self::ALLOWED_FIELDS, true)) {
            throw new \InvalidArgumentException("Campo '{$field}' inválido para atualização.");
        }

        $existing = $this->repository->findById($id);
        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        // Normalização e validações
        if ($value === 'N/A' || $value === '' || $value === null) {
            $value = null;
        }

        if ($field === 'data' && $value !== null) {
            $value = trim((string) $value);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                throw new \InvalidArgumentException('Formato de data inválido. Use YYYY-MM-DD.');
            }
        }

        if (($field === 'hora_inicio' || $field === 'hora_saida') && $value !== null) {
            $value = trim((string) $value);
            if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $value)) {
                throw new \InvalidArgumentException('Formato de horário inválido. Use HH:MM.');
            }
        }

        if ($field === 'categoria' && $value !== null) {
            $value = trim((string) $value);
            if (!in_array($value, self::CATEGORY_OPTIONS, true)) {
                throw new \InvalidArgumentException('Categoria inválida.');
            }
        }

        if ($field === 'status' && $value !== null) {
            $value = trim((string) $value);
            if (!in_array($value, self::STATUS_OPTIONS, true)) {
                throw new \InvalidArgumentException('Status inválido.');
            }
        }

        if ($field === 'equipe' && $value !== null) {
            $value = trim((string) $value);
            if (mb_strlen($value) > 100) {
                throw new \InvalidArgumentException('Equipe deve ter no máximo 100 caracteres.');
            }
        }

        if ($field === 'tecnico' && $value !== null) {
            $value = trim((string) $value);
            if (mb_strlen($value) > 100) {
                throw new \InvalidArgumentException('Técnico deve ter no máximo 100 caracteres.');
            }
        }

        if ($field === 'placa' && $value !== null) {
            $value = trim((string) $value);
            if (mb_strlen($value) > 30) {
                throw new \InvalidArgumentException('Placa deve ter no máximo 30 caracteres.');
            }
        }

        if ($field === 'equipamento_id' && $value !== null) {
            $value = (int) $value;
        }

        $this->repository->updateField($id, $field, $value);

        return [
            'id' => $id,
            'field' => $field,
            'value' => $value,
        ];
    }

    public function update(int $id, array $data, array $currentUser): array
    {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');

        $record = [
            'site' => !empty($data['site']) ? trim((string) $data['site']) : null,
            'equipamento_id' => isset($data['equipamento_id']) && $data['equipamento_id'] !== '' && $data['equipamento_id'] !== 'N/A'
                ? (int) $data['equipamento_id']
                : null,
            'localidade' => !empty($data['localidade']) && $data['localidade'] !== 'N/A' ? trim((string) $data['localidade']) : null,
            'os' => !empty($data['os']) && $data['os'] !== 'N/A' ? trim((string) $data['os']) : null,
            'data' => !empty($data['data']) ? trim((string) $data['data']) : ($existing->data ?? date('Y-m-d')),
            'hora_inicio' => !empty($data['hora_inicio']) && $data['hora_inicio'] !== 'N/A' ? trim((string) $data['hora_inicio']) : null,
            'hora_saida' => !empty($data['hora_saida']) && $data['hora_saida'] !== 'N/A' ? trim((string) $data['hora_saida']) : null,
            'categoria' => !empty($data['categoria']) ? trim((string) $data['categoria']) : null,
            'status' => !empty($data['status']) ? trim((string) $data['status']) : ($existing->status ?? null),
            'equipe' => !empty($data['equipe']) && $data['equipe'] !== 'N/A' ? trim((string) $data['equipe']) : null,
            'tecnico' => !empty($data['tecnico']) && $data['tecnico'] !== 'N/A' ? trim((string) $data['tecnico']) : null,
            'placa' => !empty($data['placa']) && $data['placa'] !== 'N/A' ? trim((string) $data['placa']) : null,
        ];

        $this->autoResolveTeamData($record);

        if ($record['data'] !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $record['data'])) {
            throw new \InvalidArgumentException('Formato de data inválido. Use YYYY-MM-DD.');
        }

        if ($record['hora_inicio'] !== null && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $record['hora_inicio'])) {
            throw new \InvalidArgumentException('Formato de hora de início inválido. Use HH:MM.');
        }

        if ($record['hora_saida'] !== null && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $record['hora_saida'])) {
            throw new \InvalidArgumentException('Formato de hora de saída inválido. Use HH:MM.');
        }

        if ($record['categoria'] !== null && !in_array($record['categoria'], self::CATEGORY_OPTIONS, true)) {
            throw new \InvalidArgumentException('Categoria inválida.');
        }

        if ($record['status'] !== null && !in_array($record['status'], self::STATUS_OPTIONS, true)) {
            throw new \InvalidArgumentException('Status inválido.');
        }

        if ($record['equipe'] !== null && mb_strlen($record['equipe']) > 100) {
            throw new \InvalidArgumentException('Equipe deve ter no máximo 100 caracteres.');
        }

        if ($record['tecnico'] !== null && mb_strlen($record['tecnico']) > 100) {
            throw new \InvalidArgumentException('Técnico deve ter no máximo 100 caracteres.');
        }

        if ($record['placa'] !== null && mb_strlen($record['placa']) > 30) {
            throw new \InvalidArgumentException('Placa deve ter no máximo 30 caracteres.');
        }

        // Histórico diário (obs): NUNCA apaga ou substitui o histórico existente.
        $existingObs = $existing->obs ?? '';
        $entriesToAppend = [];

        // 1. Log de alteração de status se status mudou
        if ($record['status'] !== null && $record['status'] !== $existing->status) {
            $entriesToAppend[] = "[{$now}] {$userName} ({$userRole}): Status alterado para '{$record['status']}'";
        }

        // 2. Nova observação submetida
        $newObsText = null;
        if (!empty($data['nova_obs'])) {
            $newObsText = trim((string) $data['nova_obs']);
        } elseif (!empty($data['new_obs'])) {
            $newObsText = trim((string) $data['new_obs']);
        } elseif (isset($data['obs']) && $data['obs'] !== null && trim((string) $data['obs']) !== '') {
            $candidate = trim((string) $data['obs']);
            if ($candidate !== trim($existingObs)) {
                if ($existingObs !== '' && str_starts_with($candidate, $existingObs)) {
                    $remainder = trim(substr($candidate, strlen($existingObs)));
                    if ($remainder !== '') {
                        $newObsText = $remainder;
                    }
                } elseif ($existingObs === '') {
                    $newObsText = $candidate;
                } else {
                    $newObsText = $candidate;
                }
            }
        }

        if ($newObsText !== null && $newObsText !== '') {
            if (!str_starts_with($newObsText, '[')) {
                $entriesToAppend[] = "[{$now}] {$userName} ({$userRole}): {$newObsText}";
            } else {
                $entriesToAppend[] = $newObsText;
            }
        }

        // Compõe o histórico final
        $finalObs = $existingObs;
        foreach ($entriesToAppend as $entry) {
            $finalObs = $finalObs !== '' ? $finalObs . "\n\n" . $entry : $entry;
        }

        $record['obs'] = $finalObs !== '' ? $finalObs : null;

        $this->repository->update($id, $record);

        $item = $this->repository->findById($id);
        return [
            'id' => $id,
            'item' => $item ? $item->toArray() : null,
        ];
    }

    public function appendObs(int $id, string $texto, array $currentUser): array
    {
        $texto = trim($texto);
        if ($texto === '') {
            throw new \InvalidArgumentException('Texto da observação não pode ser vazio.');
        }

        if (mb_strlen($texto) > 1000) {
            throw new \InvalidArgumentException('Observação deve ter no máximo 1000 caracteres.');
        }

        $existing = $this->repository->findById($id);
        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');

        $newEntry = "[{$now}] {$userName} ({$userRole}): {$texto}";
        $existingObs = $existing->obs ?? '';
        $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $newEntry : $newEntry;

        $this->repository->updateObs($id, $newObs);

        return [
            'id' => $id,
            'obs' => $newObs,
        ];
    }

    public function changeStatus(int $id, string $newStatus, array $currentUser): array
    {
        $newStatus = trim($newStatus);
        if (!in_array($newStatus, self::STATUS_OPTIONS, true)) {
            throw new \InvalidArgumentException("Status '{$newStatus}' inválido.");
        }

        $existing = $this->repository->findById($id);
        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $this->repository->updateField($id, 'status', $newStatus);

        $userName = $currentUser['nome'] ?? $currentUser['username'] ?? 'Desconhecido';
        $userRole = $currentUser['role'] ?? '';
        $now = date('d/m/Y H:i');

        $logEntry = "[{$now}] {$userName} ({$userRole}): Status alterado para '{$newStatus}'";
        $existingObs = $existing->obs ?? '';
        $newObs = $existingObs !== '' ? $existingObs . "\n\n" . $logEntry : $logEntry;

        $this->repository->updateObs($id, $newObs);

        return [
            'id' => $id,
            'status' => $newStatus,
            'obs' => $newObs,
        ];
    }

    public function delete(int $id, array $currentUser): bool
    {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $role = $currentUser['role'] ?? '';
        $isAdmin = $role === 'admin';
        $userId = isset($currentUser['id']) ? (int) $currentUser['id'] : null;

        if (!$isAdmin && $existing->createdBy !== $userId) {
            throw new \DomainException('Acesso negado: você só pode excluir linhas criadas por você.');
        }

        return $this->repository->delete($id, $userId, $isAdmin);
    }

    public function lookupOs(string $os): ?string
    {
        return $this->repository->lookupOsObs($os);
    }

    public function generateDailyEntriesForTechnicians(?string $targetDate = null): array
    {
        $date = $targetDate !== null && trim($targetDate) !== '' ? trim($targetDate) : date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new \InvalidArgumentException('Formato de data inválido. Use YYYY-MM-DD.');
        }

        $teamRepo = $this->teamRepository ?? new \App\Api\Repositories\TeamRepository();
        $teams = $teamRepo->getActiveTeamsWithTechnicians();

        $created = 0;
        $skipped = 0;
        $createdIds = [];

        foreach ($teams as $team) {
            $tecnico = trim((string) ($team['tecnico'] ?? ''));
            $equipe = trim((string) ($team['nome'] ?? ''));
            $placa = !empty($team['placa']) ? trim((string) $team['placa']) : null;

            if ($tecnico === '') {
                $skipped++;
                continue;
            }

            if ($this->repository->hasEntryForTechnicianOrTeamOnDate($date, $tecnico, $equipe)) {
                $skipped++;
                continue;
            }

            $record = [
                'data' => $date,
                'equipe' => $equipe !== '' ? $equipe : null,
                'tecnico' => $tecnico,
                'placa' => $placa,
                'site' => null,
                'equipamento_id' => null,
                'localidade' => null,
                'os' => null,
                'hora_inicio' => null,
                'hora_saida' => null,
                'categoria' => null,
                'status' => null,
                'obs' => null,
            ];

            $newId = $this->repository->create($record, null);
            if ($newId > 0) {
                $created++;
                $createdIds[] = $newId;
            } else {
                $skipped++;
            }
        }

        if ($created > 0) {
            \App\Api\Helpers\Cache::deleteByPrefix('diario_');
        }

        return [
            'date' => $date,
            'total_teams' => count($teams),
            'created' => $created,
            'skipped' => $skipped,
            'created_ids' => $createdIds,
        ];
    }

    private function autoResolveTeamData(array &$record): void
    {
        if (!empty($record['equipe']) && (empty($record['tecnico']) || empty($record['placa']))) {
            try {
                $teamRepo = $this->teamRepository ?? new \App\Api\Repositories\TeamRepository();
                $team = $teamRepo->findByNameExact($record['equipe']) ?? $teamRepo->findByNameCase($record['equipe']);
                if ($team) {
                    if (empty($record['tecnico']) && !empty($team['tecnico'])) {
                        $record['tecnico'] = $team['tecnico'];
                    }
                    if (empty($record['placa']) && !empty($team['placa'])) {
                        $record['placa'] = $team['placa'];
                    }
                }
            } catch (\Throwable) {
                // Non-blocking fallback
            }
        }
    }
}
