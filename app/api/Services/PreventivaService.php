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
        'Concluído' => ['Em Andamento'],
    ];

    public function __construct(?PreventivaRepository $repository = null)
    {
        $this->repository = $repository ?? new PreventivaRepository();
    }

    public function planPreventiva(array $data, array $currentUser): array
    {
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

        $record = [
            'site' => $site,
            'data_planejada' => $dataPlanejada,
            'ticket' => $ticket,
            'equipe' => $equipe,
            'obs' => $auditEntry,
        ];

        $id = $this->repository->create($record, self::DEFAULT_STATUS);

        return ['action' => 'created', 'id' => $id];
    }

    public function updateStatus(int $id, string $novoStatus, string $obs, array $currentUser, ?string $dataPlanejada = null): array
    {
        $record = $this->repository->getById($id);

        if (!$record) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $statusAtual = $record['status'];
        $transitions = self::ALLOWED_STATUS_TRANSITIONS[$statusAtual] ?? [];

        if (!in_array($novoStatus, $transitions, true)) {
            throw new \RuntimeException(
                "Transição inválida de '{$statusAtual}' para '{$novoStatus}'. " .
                "Permitidas: " . ($transitions ? implode(', ', $transitions) : 'nenhuma')
            );
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

        if ($dataPlanejada !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataPlanejada)) {
            throw new \RuntimeException('Formato de data inválido.');
        }

        $this->repository->updateStatus($id, $novoStatus, $newObs, $dataPlanejada);

        return ['action' => 'status_updated', 'id' => $id, 'status' => $novoStatus];
    }

    public function delete(int $id): array
    {
        $record = $this->repository->getById($id);

        if (!$record) {
            throw new \RuntimeException('Registro não encontrado.');
        }

        $this->repository->delete($id);

        return ['action' => 'deleted'];
    }
}
