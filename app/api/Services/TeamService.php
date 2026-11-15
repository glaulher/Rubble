<?php

namespace App\Api\Services;

use App\Api\Repositories\TeamRepository;
use Exception;

class TeamService
{
    private TeamRepository $repository;

    public function __construct(?TeamRepository $repository = null)
    {
        $this->repository = $repository ?? new TeamRepository();
    }

    public function listAll(int $limit = 9999, int $offset = 0): array
    {
        $items = $this->repository->listAll($limit, $offset);
        $total = $this->repository->count();
        return ['items' => $items, 'total' => $total];
    }

    public function save(array $data): int
    {
        $normalized = $this->normalizeData($data);
        $this->validateData($normalized);

        $existing = $this->repository->findByNameCase($normalized['nome']);
        if ($existing) {
            throw new Exception('Esta equipe já está cadastrada');
        }

        return $this->repository->save($normalized);
    }

    public function update(int $id, array $data): void
    {
        $normalized = $this->normalizeData($data);
        $this->validateData($normalized);

        $existing = $this->repository->findByNameCase($normalized['nome']);
        if ($existing && (int) $existing['id'] !== $id) {
            throw new Exception('Esta equipe já está cadastrada');
        }

        $this->repository->update($id, $normalized);
    }

    public function delete(int $id): void
    {
        $this->repository->delete($id);
    }

    private function normalizeData(array $data): array
    {
        $name = trim((string) ($data['nome'] ?? ($data['name'] ?? '')));
        $tecnico = isset($data['tecnico']) && trim((string) $data['tecnico']) !== '' ? trim((string) $data['tecnico']) : null;
        $placa = isset($data['placa']) && trim((string) $data['placa']) !== '' ? mb_strtoupper(trim((string) $data['placa'])) : null;
        $veiculo = isset($data['veiculo']) && trim((string) $data['veiculo']) !== '' ? trim((string) $data['veiculo']) : null;
        $contrato = isset($data['contrato']) && trim((string) $data['contrato']) !== '' ? trim((string) $data['contrato']) : null;
        $active = isset($data['ativo']) ? (int) $data['ativo'] : (isset($data['active']) ? (int) $data['active'] : 1);

        return [
            'nome' => $name,
            'tecnico' => $tecnico,
            'placa' => $placa,
            'veiculo' => $veiculo,
            'contrato' => $contrato,
            'ativo' => $active,
        ];
    }

    private function validateData(array $data): void
    {
        $name = $data['nome'];
        if ($name === '') {
            throw new Exception('Nome da equipe é obrigatório');
        }
        if (mb_strlen($name) > 100) {
            throw new Exception('Nome da equipe não pode ter mais de 100 caracteres');
        }
        if (!empty($data['tecnico']) && mb_strlen($data['tecnico']) > 100) {
            throw new Exception('Nome do técnico não pode ter mais de 100 caracteres');
        }
        if (!empty($data['placa']) && mb_strlen($data['placa']) > 30) {
            throw new Exception('Placa não pode ter mais de 30 caracteres');
        }
        if (!empty($data['veiculo']) && mb_strlen($data['veiculo']) > 50) {
            throw new Exception('Veículo não pode ter mais de 50 caracteres');
        }
        if (!empty($data['contrato']) && mb_strlen($data['contrato']) > 50) {
            throw new Exception('Contrato não pode ter mais de 50 caracteres');
        }
    }
}
