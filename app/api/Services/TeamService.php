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
        $name = trim($data['nome'] ?? ($data['name'] ?? ''));
        $this->validateName($name);

        $existing = $this->repository->findByNameCase($name);
        if ($existing) {
            throw new Exception('Esta equipe já está cadastrada');
        }

        return $this->repository->save($data);
    }

    public function update(int $id, array $data): void
    {
        $name = trim($data['nome'] ?? ($data['name'] ?? ''));
        $this->validateName($name);

        $existing = $this->repository->findByNameCase($name);
        if ($existing && (int) $existing['id'] !== $id) {
            throw new Exception('Esta equipe já está cadastrada');
        }

        $this->repository->update($id, $data);
    }

    public function delete(int $id): void
    {
        $this->repository->delete($id);
    }

    private function validateName(string $name): void
    {
        $name = trim($name);
        if ($name === '') {
            throw new Exception('Nome da equipe é obrigatório');
        }
        if (mb_strlen($name) > 100) {
            throw new Exception('Nome da equipe não pode ter mais de 100 caracteres');
        }
    }
}
