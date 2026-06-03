<?php

namespace App\Api\Services;

use App\Api\Repositories\EquipmentManagementRepository;
use Exception;

class EquipmentManagementService
{
    private EquipmentManagementRepository $repository;

    public function __construct()
    {
        $this->repository = new EquipmentManagementRepository();
    }

    public function getById(int $id): ?array
    {
        return $this->repository->getById($id);
    }

    public function listAll(?string $search, int $limit, int $offset): array
    {
        $items = $this->repository->listAll($search, $limit, $offset);
        $total = $this->repository->count($search);
        return ['items' => $items, 'total' => $total];
    }

    public function save(array $data): int
    {
        $mercado = $data['mercado'] ?? '';
        if ($mercado === '') {
            throw new \InvalidArgumentException('Mercado é obrigatório');
        }
        $allowedMercados = ['Residencial', 'Empresarial', 'Pessoal'];
        if (!in_array($mercado, $allowedMercados, true)) {
            throw new \InvalidArgumentException('Mercado inválido');
        }

        $enderecoId = $this->repository->findOrCreateEndereco(
            $data['local_do_endereco'],
            $data['endereco'],
            $data['uf']
        );

        $data['endereco_id'] = $enderecoId;
        return $this->repository->insert($data);
    }

    public function update(int $id, array $data): void
    {
        if (isset($data['mercado'])) {
            $allowedMercados = ['Residencial', 'Empresarial', 'Pessoal'];
            if (!in_array($data['mercado'], $allowedMercados, true)) {
                throw new \InvalidArgumentException('Mercado inválido');
            }
        }

        $enderecoId = $this->repository->findOrCreateEndereco(
            $data['local_do_endereco'],
            $data['endereco'],
            $data['uf']
        );

        $data['endereco_id'] = $enderecoId;
        $this->repository->update($id, $data);
    }

    public function delete(int $id): void
    {
        $canDelete = $this->repository->canDelete($id);

        if (!$canDelete['can_delete']) {
            $parts = [];
            if ($canDelete['registros_count'] > 0) {
                $parts[] = $canDelete['registros_count'] . ' registro(s)';
            }
            if ($canDelete['pvs_count'] > 0) {
                $parts[] = $canDelete['pvs_count'] . ' PV(s)';
            }
            throw new Exception(
                'Não é possível excluir: equipamento possui ' . implode(' e ', $parts) . ' vinculados. Remova os vínculos primeiro.'
            );
        }

        $enderecoId = $this->repository->getEnderecoId($id);

        $this->repository->delete($id);

        if ($enderecoId) {
            $this->repository->cleanupOrphanEndereco($enderecoId);
        }
    }
}
