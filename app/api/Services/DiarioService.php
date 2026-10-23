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
    ];

    public const ALLOWED_SORT = [
        'id', 'site', 'equipamento', 'equipamento_id', 'equipamento_nome',
        'localidade', 'os', 'data', 'categoria', 'status', 'equipe', 'created_at',
        'd.id', 'd.site', 'd.localidade', 'd.os', 'd.data', 'd.categoria',
        'd.status', 'd.equipe', 'd.created_at', 'e.equipamento'
    ];

    public const ALLOWED_DIRS = ['ASC', 'DESC'];

    public const ALLOWED_FIELDS = [
        'site', 'equipamento_id', 'localidade', 'os', 'data', 'categoria', 'status', 'equipe'
    ];

    private DiarioRepository $repository;

    public function __construct(?DiarioRepository $repository = null)
    {
        $this->repository = $repository ?? new DiarioRepository();
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

        $record = [
            'site' => !empty($data['site']) ? trim((string) $data['site']) : null,
            'equipamento_id' => isset($data['equipamento_id']) && $data['equipamento_id'] !== '' && $data['equipamento_id'] !== 'N/A'
                ? (int) $data['equipamento_id']
                : null,
            'localidade' => !empty($data['localidade']) && $data['localidade'] !== 'N/A' ? trim((string) $data['localidade']) : null,
            'os' => !empty($data['os']) && $data['os'] !== 'N/A' ? trim((string) $data['os']) : null,
            'data' => !empty($data['data']) ? trim((string) $data['data']) : date('Y-m-d'),
            'categoria' => !empty($data['categoria']) ? trim((string) $data['categoria']) : null,
            'status' => !empty($data['status']) ? trim((string) $data['status']) : null,
            'equipe' => !empty($data['equipe']) && $data['equipe'] !== 'N/A' ? trim((string) $data['equipe']) : null,
            'obs' => !empty($data['obs']) ? trim((string) $data['obs']) : null,
        ];

        if ($record['data'] !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $record['data'])) {
            throw new \InvalidArgumentException('Formato de data inválido. Use YYYY-MM-DD.');
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
}
