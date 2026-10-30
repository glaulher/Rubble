<?php

namespace App\Api\Entities;

class SolicitacaoCompra
{
    public int $id;
    public string $tituloEmail;
    public string $status;
    public string $site;
    public ?int $equipamentoId;
    public ?string $equipamentoTexto;
    public ?string $numeroSc;
    public ?string $numeroPc;
    public ?string $numeroPv;
    public ?float $valorSc;
    public ?string $data;
    public ?string $dataStatus;
    public ?int $slaDias;
    public ?string $observacao;
    public ?string $slaNotificadoEm;
    public ?string $slaNotificadoDataStatus;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data)
    {
        $this->id = (int) ($data['id'] ?? 0);
        $this->tituloEmail = (string) ($data['titulo_email'] ?? '');
        $this->status = (string) ($data['status'] ?? '');
        $this->site = (string) ($data['site'] ?? '');
        $this->equipamentoId = self::toInt($data['equipamento_id'] ?? null);
        $this->equipamentoTexto = self::toString($data['equipamento_texto'] ?? null);
        $this->numeroSc = self::toString($data['numero_sc'] ?? null);
        $this->numeroPc = self::toString($data['numero_pc'] ?? null);
        $this->numeroPv = self::toString($data['numero_pv'] ?? null);
        $this->valorSc = self::toFloat($data['valor_sc'] ?? null);
        $this->data = self::toString($data['data'] ?? null);
        $this->dataStatus = self::toString($data['data_status'] ?? null);
        $this->slaDias = self::toInt($data['sla_dias'] ?? null);
        $this->observacao = self::toString($data['observacao'] ?? null);
        $this->slaNotificadoEm = self::toString($data['sla_notificado_em'] ?? null);
        $this->slaNotificadoDataStatus = self::toString($data['sla_notificado_data_status'] ?? null);
        $this->createdAt = self::toString($data['created_at'] ?? null);
        $this->updatedAt = self::toString($data['updated_at'] ?? null);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'titulo_email' => $this->tituloEmail,
            'status' => $this->status,
            'site' => $this->site,
            'equipamento_id' => $this->equipamentoId,
            'equipamento_texto' => $this->equipamentoTexto,
            'numero_sc' => $this->numeroSc,
            'numero_pc' => $this->numeroPc,
            'numero_pv' => $this->numeroPv,
            'valor_sc' => $this->valorSc,
            'data' => $this->data,
            'data_status' => $this->dataStatus,
            'sla_dias' => $this->slaDias,
            'observacao' => $this->observacao,
            'sla_notificado_em' => $this->slaNotificadoEm,
            'sla_notificado_data_status' => $this->slaNotificadoDataStatus,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }

    private static function toString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }

    private static function toInt(mixed $value): ?int
    {
        $string = self::toString($value);

        return $string === null ? null : (int) $string;
    }

    private static function toFloat(mixed $value): ?float
    {
        $string = self::toString($value);

        return $string === null ? null : (float) $string;
    }
}
