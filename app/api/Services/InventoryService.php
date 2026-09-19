<?php

declare(strict_types=1);

namespace App\Api\Services;

use App\Api\Repositories\InventoryRepository;

class InventoryService
{
    private InventoryRepository $repository;
    private const ALLOWED_CATEGORIES = ['veiculo', 'ferramenta', 'celular_ti', 'equipamento', 'outros'];

    public function __construct(InventoryRepository $repository)
    {
        $this->repository = $repository;
    }

    public function list(array $filters, int $limit, int $offset): array
    {
        $items = $this->repository->list($filters, $limit, $offset);
        $total = $this->repository->count($filters);
        return [
            'success' => true,
            'data' => $items,
            'total' => $total,
        ];
    }

    public function get(int $id): array
    {
        $item = $this->repository->findById($id);
        if (!$item) {
            return ['success' => false, 'message' => 'Item de inventário não encontrado.'];
        }
        return ['success' => true, 'data' => $item->toArray()];
    }

    public function create(array $data, ?int $userId): array
    {
        $validation = $this->validate($data);
        if (!$validation['valid']) {
            return ['success' => false, 'message' => $validation['message']];
        }

        $id = $this->repository->create($data, $userId);
        if ($id <= 0) {
            return ['success' => false, 'message' => 'Erro ao salvar item de inventário no banco de dados.'];
        }

        return ['success' => true, 'message' => 'Item cadastrado com sucesso.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data): array
    {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Item não encontrado para atualização.'];
        }

        $validation = $this->validate($data);
        if (!$validation['valid']) {
            return ['success' => false, 'message' => $validation['message']];
        }

        $success = $this->repository->update($id, $data);
        if (!$success) {
            return ['success' => false, 'message' => 'Erro ao atualizar item de inventário.'];
        }

        return ['success' => true, 'message' => 'Item atualizado com sucesso.'];
    }

    public function delete(int $id): array
    {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Item não encontrado para exclusão.'];
        }

        $success = $this->repository->delete($id);
        return $success
            ? ['success' => true, 'message' => 'Item excluído com sucesso.']
            : ['success' => false, 'message' => 'Erro ao excluir item.'];
    }

    public function getTechnicians(): array
    {
        return [
            'success' => true,
            'data' => $this->repository->getDistinctTechnicians(),
        ];
    }

    private function validate(array $data): array
    {
        $required = ['tecnico_nome', 'material_nome', 'modelo', 'serial', 'data_retirada'];
        foreach ($required as $field) {
            if (empty(trim((string)($data[$field] ?? '')))) {
                return ['valid' => false, 'message' => "Campos obrigatórios não preenchidos: {$field}."];
            }
        }

        $cat = $data['categoria'] ?? 'ferramenta';
        if (!in_array($cat, self::ALLOWED_CATEGORIES, true)) {
            return ['valid' => false, 'message' => 'Categoria inválida informada.'];
        }

        if (!empty($data['data_devolucao'])) {
            if ($data['data_devolucao'] < $data['data_retirada']) {
                return ['valid' => false, 'message' => 'A data de devolução não pode ser anterior à data de retirada.'];
            }
        }

        return ['valid' => true, 'message' => ''];
    }
}
