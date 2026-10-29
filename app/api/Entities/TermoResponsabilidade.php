<?php

declare(strict_types=1);

namespace App\Api\Entities;

class TermoResponsabilidade
{
    public ?int $id;
    public string $codigo;
    public ?int $emissorId;
    public string $entregue_por;
    public string $tecnico_nome;
    public ?string $tecnicoDocumento;
    public ?string $tecnicoTelefone;
    public string $status;
    public string $tokenAssinatura;
    public string $tokenExpiraEm;
    public ?string $assinaturaImagem;
    public ?string $assinadoEm;
    public ?string $assinadoIp;
    public ?string $assinadoUserAgent;
    public ?string $observacoes;
    public ?string $createdAt;
    public ?string $updatedAt;
    /** @var TermoItem[] */
    public array $itens = [];

    public function __construct(array $data)
    {
        $this->id = isset($data['id']) ? (int) $data['id'] : null;
        $this->codigo = (string) ($data['codigo'] ?? '');
        $this->emissorId = isset($data['emissor_id']) ? (int) $data['emissor_id'] : null;
        $this->entregue_por = trim((string) ($data['entregue_por'] ?? ''));
        $this->tecnico_nome = trim((string) ($data['tecnico_nome'] ?? ''));
        $this->tecnicoDocumento = !empty($data['tecnico_documento']) ? trim((string) $data['tecnico_documento']) : null;
        $this->tecnicoTelefone = !empty($data['tecnico_telefone']) ? trim((string) $data['tecnico_telefone']) : null;
        $this->status = (string) ($data['status'] ?? 'pendente');
        $this->tokenAssinatura = (string) ($data['token_assinatura'] ?? '');
        $this->tokenExpiraEm = (string) ($data['token_expira_em'] ?? '');
        $this->assinaturaImagem = !empty($data['assinatura_imagem']) ? (string) $data['assinatura_imagem'] : null;
        $this->assinadoEm = !empty($data['assinado_em']) ? (string) $data['assinado_em'] : null;
        $this->assinadoIp = !empty($data['assinado_ip']) ? (string) $data['assinado_ip'] : null;
        $this->assinadoUserAgent = !empty($data['assinado_user_agent']) ? (string) $data['assinado_user_agent'] : null;
        $this->observacoes = !empty($data['observacoes']) ? trim((string) $data['observacoes']) : null;
        $this->createdAt = isset($data['created_at']) && $data['created_at'] !== null ? (string) $data['created_at'] : null;
        $this->updatedAt = isset($data['updated_at']) && $data['updated_at'] !== null ? (string) $data['updated_at'] : null;

        if (!empty($data['itens']) && is_array($data['itens'])) {
            foreach ($data['itens'] as $it) {
                if ($it instanceof TermoItem) {
                    $this->itens[] = $it;
                } elseif (is_array($it)) {
                    $this->itens[] = new TermoItem($it);
                }
            }
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'emissor_id' => $this->emissorId,
            'entregue_por' => $this->entregue_por,
            'tecnico_nome' => $this->tecnico_nome,
            'tecnico_documento' => $this->tecnicoDocumento,
            'tecnico_telefone' => $this->tecnicoTelefone,
            'status' => $this->status,
            'token_assinatura' => $this->tokenAssinatura,
            'token_expira_em' => $this->tokenExpiraEm,
            'assinatura_imagem' => $this->assinaturaImagem,
            'assinado_em' => $this->assinadoEm,
            'assinado_ip' => $this->assinadoIp,
            'assinado_user_agent' => $this->assinadoUserAgent,
            'observacoes' => $this->observacoes,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'itens' => array_map(fn(TermoItem $item) => $item->toArray(), $this->itens),
        ];
    }
}
