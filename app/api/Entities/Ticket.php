<?php

namespace App\Api\Entities;

class Ticket
{
    public int $id;
    public int $equipmentId;
    public ?string $os;
    public ?string $date;
    public ?string $team;
    public ?string $status;
    public ?string $material;
    public ?string $notes;
    public ?string $completionDate;
    public ?string $plannedDate;
    public ?int $notificationSent;
    public ?string $origin;
    public ?string $tipo;
    public ?string $local;
    public ?string $equipment;
    public ?string $sla_days;
    public ?string $sla_include_saturday;
    public ?string $sla_include_sunday;

    public function __construct(array $data)
    {
        $this->id = (int) $data['id'];
        $this->equipmentId = (int) $data['equipamento_id'];
        $this->os = $data['os'] ?? null;
        $this->date = $data['data'] ?? null;
        $this->team = $data['equipe'] ?? null;
        $this->status = $data['status'] ?? null;
        $this->material = $data['material'] ?? null;
        $this->notes = $data['obs'] ?? null;
        $this->completionDate = $data['data_concluido'] ?? null;
        $this->plannedDate = $data['data_planejada'] ?? null;
        $this->notificationSent = isset($data['notificacao_enviada']) ? (int) $data['notificacao_enviada'] : null;
        $this->origin = $data['origin'] ?? null;
        $this->tipo = $data['tipo'] ?? 'preventiva';
        $this->local = $data['local'] ?? null;
        $this->equipment = $data['equipamento'] ?? null;
        $this->sla_days = $data['sla_days'] ?? null;
        $this->sla_include_saturday = $data['sla_include_saturday'] ?? null;
        $this->sla_include_sunday = $data['sla_include_sunday'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'equipamento_id' => $this->equipmentId,
            'os' => $this->os,
            'data' => $this->date,
            'equipe' => $this->team,
            'status' => $this->status,
            'material' => $this->material,
            'obs' => $this->notes,
            'data_concluido' => $this->completionDate,
            'data_planejada' => $this->plannedDate,
            'notificacao_enviada' => $this->notificationSent,
            'tipo' => $this->tipo,
            'local' => $this->local,
            'equipamento' => $this->equipment,
        ];
    }
}
