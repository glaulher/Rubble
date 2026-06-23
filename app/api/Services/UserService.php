<?php

namespace App\Api\Services;

use App\Api\Repositories\UserRepository;
use Exception;

class UserService
{
    private UserRepository $repository;

    public function __construct(?UserRepository $repository = null)
    {
        $this->repository = $repository ?? new UserRepository();
    }

    public function listAll(?string $search, int $limit, int $offset): array
    {
        $items = $this->repository->listAll($search, $limit, $offset);
        $total = $this->repository->count($search);
        return ['items' => $items, 'total' => $total];
    }

    public function getById(int $id): ?array
    {
        return $this->repository->getById($id);
    }

    public function save(array $data): int
    {
        $existing = $this->repository->findByUsername($data['username']);
        if ($existing) {
            throw new Exception('Este e-mail já está em uso');
        }

        if (strlen($data['password']) < 6) {
            throw new Exception('Senha deve ter pelo menos 6 caracteres');
        }
        if (strlen($data['password']) > 128) {
            throw new Exception('Senha não pode ter mais de 128 caracteres');
        }

        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);

        return $this->repository->insert($data);
    }

    public function update(int $id, array $data): void
    {
        $existing = $this->repository->findByUsername($data['username']);
        if ($existing && (int)$existing['id'] !== $id) {
            throw new Exception('Este e-mail já está em uso');
        }

        // Password is optional on update — only rehash if provided
        if (!empty($data['password'])) {
            if (strlen($data['password']) < 6) {
                throw new Exception('Senha deve ter pelo menos 6 caracteres');
            }
            if (strlen($data['password']) > 128) {
                throw new Exception('Senha não pode ter mais de 128 caracteres');
            }
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        } else {
            unset($data['password']);
        }

        $this->repository->update($id, $data);
    }

    public function delete(int $id, int $currentUserId): void
    {
        if ($id === $currentUserId) {
            throw new Exception('Você não pode excluir seu próprio usuário');
        }

        $this->repository->delete($id);
    }
}
