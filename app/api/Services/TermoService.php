<?php

declare(strict_types=1);

namespace App\Api\Services;

use App\Api\Repositories\TermoRepository;
use App\Api\Repositories\InventoryRepository;

class TermoService
{
    private TermoRepository $repository;
    private InventoryRepository $inventoryRepository;

    public function __construct(TermoRepository $repository, InventoryRepository $inventoryRepository)
    {
        $this->repository = $repository;
        $this->inventoryRepository = $inventoryRepository;
    }

    public function createTermo(array $data, ?int $userId): array
    {
        $entreguePor = trim((string) ($data['entregue_por'] ?? ''));
        $tecnicoNome = trim((string) ($data['tecnico_nome'] ?? ''));
        $itens = $data['itens'] ?? [];

        if ($entreguePor === '' || $tecnicoNome === '') {
            return [
                'success' => false,
                'message' => 'Campos obrigatórios não preenchidos: entregue_por e tecnico_nome são obrigatórios.',
            ];
        }

        if (!is_array($itens) || empty($itens)) {
            return [
                'success' => false,
                'message' => 'O termo deve conter pelo menos uma ferramenta ou equipamento.',
            ];
        }

        // Validação dos itens
        foreach ($itens as $idx => $it) {
            $mat = trim((string) ($it['material_nome'] ?? ''));
            if ($mat === '') {
                return [
                    'success' => false,
                    'message' => "Item #" . ($idx + 1) . " deve ter descrição/material preenchido.",
                ];
            }
        }

        $codigo = $this->repository->generateNextCode();
        $token = bin2hex(random_bytes(32));
        $expiraEm = date('Y-m-d H:i:s', strtotime('+7 days'));

        $termoData = [
            'codigo' => $codigo,
            'entregue_por' => $entreguePor,
            'tecnico_nome' => $tecnicoNome,
            'tecnico_documento' => !empty($data['tecnico_documento']) ? trim((string) $data['tecnico_documento']) : null,
            'tecnico_telefone' => !empty($data['tecnico_telefone']) ? trim((string) $data['tecnico_telefone']) : null,
            'status' => 'pendente',
            'token_assinatura' => $token,
            'token_expira_em' => $expiraEm,
            'observacoes' => !empty($data['observacoes']) ? trim((string) $data['observacoes']) : null,
        ];

        $termoId = $this->repository->create($termoData, $itens, $userId);
        if ($termoId <= 0) {
            return [
                'success' => false,
                'message' => 'Erro ao salvar termo de responsabilidade no banco de dados.',
            ];
        }

        return [
            'success' => true,
            'message' => 'Termo criado com sucesso. Compartilhe o link com o técnico.',
            'data' => [
                'id' => $termoId,
                'codigo' => $codigo,
                'token' => $token,
                'expira_em' => $expiraEm,
            ],
        ];
    }

    public function getPublicTermo(string $token): array
    {
        $token = trim($token);
        if ($token === '' || strlen($token) !== 64 || !ctype_xdigit($token)) {
            return [
                'success' => false,
                'message' => 'Token de assinatura inválido.',
                'code' => 400,
            ];
        }

        $termo = $this->repository->findByToken($token);
        if (!$termo) {
            return [
                'success' => false,
                'message' => 'Termo não encontrado ou link inexistente.',
                'code' => 404,
            ];
        }

        if (strtotime($termo->tokenExpiraEm) < time()) {
            return [
                'success' => false,
                'message' => 'Este link de assinatura expirou. Solicite um novo termo.',
                'code' => 410,
            ];
        }

        $alreadySigned = ($termo->status !== 'pendente');
        return [
            'success' => true,
            'data' => $termo->toArray(),
            'already_signed' => $alreadySigned,
            'code' => 200,
        ];
    }

    public function signPublicTermo(string $token, string $signatureBase64, string $ip, string $userAgent): array
    {
        $token = trim($token);
        if ($token === '' || strlen($token) !== 64 || !ctype_xdigit($token)) {
            return [
                'success' => false,
                'message' => 'Token de assinatura inválido.',
                'code' => 400,
            ];
        }

        $signatureBase64 = trim($signatureBase64);
        if ($signatureBase64 === '' || strlen($signatureBase64) < 100) {
            return [
                'success' => false,
                'message' => 'Assinatura inválida ou em branco. Por favor assine na área indicada.',
                'code' => 400,
            ];
        }

        if (!preg_match('#^data:image/png;base64,[A-Za-z0-9+/=]+$#', $signatureBase64)) {
            return [
                'success' => false,
                'message' => 'Formato de imagem inválido. A assinatura deve ser um PNG válido.',
                'code' => 400,
            ];
        }

        $termo = $this->repository->findByToken($token);
        if (!$termo) {
            return [
                'success' => false,
                'message' => 'Termo não encontrado ou link inexistente.',
                'code' => 404,
            ];
        }

        if (strtotime($termo->tokenExpiraEm) < time()) {
            return [
                'success' => false,
                'message' => 'Este link de assinatura expirou. Solicite um novo termo.',
                'code' => 410,
            ];
        }

        if ($termo->status !== 'pendente') {
            return [
                'success' => false,
                'message' => 'Este termo já foi assinado anteriormente.',
                'code' => 409,
            ];
        }

        $saved = $this->repository->saveSignature((int) $termo->id, $signatureBase64, $ip, $userAgent);
        if (!$saved) {
            return [
                'success' => false,
                'message' => 'Erro ao registrar assinatura no banco de dados.',
                'code' => 500,
            ];
        }

        // Sincronizar itens vinculados no inventário
        $dataRetirada = date('Y-m-d');
        foreach ($termo->itens as $item) {
            if ($item->inventarioId) {
                $this->inventoryRepository->transferCustody(
                    $item->inventarioId,
                    $termo->tecnico_nome,
                    $dataRetirada,
                    $termo->codigo
                );
            }
        }

        return [
            'success' => true,
            'message' => 'Termo assinado com sucesso!',
            'data' => [
                'id' => $termo->id,
                'codigo' => $termo->codigo,
                'assinado_em' => date('Y-m-d H:i:s'),
            ],
            'code' => 200,
        ];
    }

    public function devolverItens(int $termoId, array $itemIds, string $dataDevolucao, ?string $obs = null): array
    {
        $itemIds = array_values(array_filter(array_map('intval', $itemIds), fn($val) => $val > 0));
        if (empty($itemIds)) {
            return [
                'success' => false,
                'message' => 'Selecione pelo menos um item para registrar a devolução.',
            ];
        }

        $termo = $this->repository->findById($termoId);
        if (!$termo) {
            return [
                'success' => false,
                'message' => 'Termo não encontrado.',
            ];
        }

        $success = $this->repository->returnItems($termoId, $itemIds, $dataDevolucao, $obs);
        if (!$success) {
            return [
                'success' => false,
                'message' => 'Erro ao processar devolução dos itens.',
            ];
        }

        // Sincronizar com o inventário
        foreach ($termo->itens as $it) {
            if (in_array((int) $it->id, $itemIds, true) && $it->inventarioId) {
                $this->inventoryRepository->markReturned($it->inventarioId, $dataDevolucao, $obs);
            }
        }

        return [
            'success' => true,
            'message' => 'Devolução registrada com sucesso.',
        ];
    }

    public function deleteTermo(int $id): array
    {
        $termo = $this->repository->findById($id);
        if (!$termo) {
            return [
                'success' => false,
                'message' => 'Termo não encontrado.',
            ];
        }

        if ($termo->status !== 'pendente') {
            return [
                'success' => false,
                'message' => 'Não é possível excluir: apenas termos pendentes podem ser excluídos/cancelados.',
            ];
        }

        $deleted = $this->repository->delete($id);
        if (!$deleted) {
            return [
                'success' => false,
                'message' => 'Erro ao excluir termo do banco de dados.',
            ];
        }

        return [
            'success' => true,
            'message' => 'Termo excluído com sucesso.',
        ];
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
        $termo = $this->repository->findById($id);
        if (!$termo) {
            return [
                'success' => false,
                'message' => 'Termo não encontrado.',
            ];
        }
        return [
            'success' => true,
            'data' => $termo->toArray(),
        ];
    }
}
