<?php

namespace App\Api\Services;

use App\Api\Repositories\TicketRepository;
use App\Api\Repositories\EquipmentRepository;
use App\Api\Entities\Ticket;

class TicketService
{
    public const STATUS_PRIORITY = [
        'projeto clean up' => 1,
        'planejado' => 2,
        'pendente' => 3,
        'em andamento' => 4,
        'conclu%' => 5,
    ];

    private TicketRepository $ticketRepository;
    private EquipmentRepository $equipmentRepository;

    public function __construct(
        ?TicketRepository $ticketRepository = null,
        ?EquipmentRepository $equipmentRepository = null
    ) {
        $this->ticketRepository = $ticketRepository ?? new TicketRepository();
        $this->equipmentRepository = $equipmentRepository ?? new EquipmentRepository();
    }

    public function listByItem(int $id): array
    {
        $tickets = $this->ticketRepository->listByItem($id, self::STATUS_PRIORITY);
        return array_map(fn(Ticket $r) => $r->toArray(), $tickets);
    }

    public function save(array $data): int
    {
        if (isset($data['status'])) {
            $data['status'] = $this->normalizeStatus($data['status']);
        }
        if (isset($data['status']) && $data['status'] === 'Planejado' && empty($data['data_planejada'])) {
            throw new \RuntimeException('Data planejada é obrigatória para o status Planejado');
        }
        try {
            return $this->ticketRepository->save($data);
        } catch (\mysqli_sql_exception $e) {
            if ($e->getCode() === 1062) {
                throw new \RuntimeException(
                    "OS \"" . ($data['os'] ?? '') . "\" já cadastrada ou já foi utilizada"
                );
            }
            throw $e;
        }
    }

    public function getById(int $id): ?array
    {
        $ticket = $this->ticketRepository->getById($id);
        return $ticket?->toArray();
    }

    public function findByOs(string $os): ?array
    {
        $ticket = $this->ticketRepository->findByOs($os);
        return $ticket?->toArray();
    }

    public function update(array $data): bool
    {
        if (isset($data['status'])) {
            $data['status'] = $this->normalizeStatus($data['status']);
        }
        if (isset($data['status']) && $data['status'] === 'Planejado' && empty($data['data_planejada'])) {
            throw new \RuntimeException('Data planejada é obrigatória para o status Planejado');
        }
        try {
            return $this->ticketRepository->update($data);
        } catch (\mysqli_sql_exception $e) {
            if ($e->getCode() === 1062) {
                throw new \RuntimeException(
                    "OS \"" . ($data['os'] ?? '') . "\" já cadastrada ou já foi utilizada"
                );
            }
            throw $e;
        }
    }

    public function delete(int $id): bool
    {
        return $this->ticketRepository->delete($id);
    }

    public function importBatch(array $rows): array
    {
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                $siteCode = $this->extractSiteCode($row['empresa'] ?? '');
                if (!$siteCode) {
                    $skipped++;
                    $errors[] = ['linha' => $index + 1, 'motivo' => 'Local não encontrado'];
                    continue;
                }

                $equipments = $this->equipmentRepository->listByLocal($siteCode);
                if (empty($equipments)) {
                    $equipments = $this->equipmentRepository->listByLocalLike($siteCode);
                }
                if (empty($equipments)) {
                    $skipped++;
                    $errors[] = ['linha' => $index + 1, 'motivo' => "Nenhum equipamento encontrado para o local {$siteCode}"];
                    continue;
                }

                $matchedEquipments = $this->findMatchingEquipment($row, $equipments);
                if (empty($matchedEquipments)) {
                    $skipped++;
                    $errors[] = ['linha' => $index + 1, 'motivo' => 'Equipamento não encontrado'];
                    continue;
                }

                $status = $this->normalizeStatus($row['status'] ?? '');

                $date = $this->parseDate($row['dataCriacao'] ?? '');
                $completionDate = null;
                if (str_starts_with($status, 'Conclu')) {
                    $completionDate = $this->parseDate($row['dataAlteracao'] ?? '');
                }

                if (str_starts_with($status, 'Conclu') && $completionDate === null) {
                    $skipped++;
                    $errors[] = ['linha' => $index + 1, 'motivo' => 'Concluído sem data de conclusão'];
                    continue;
                }

                $material = $this->determineMaterial($row['materiais'] ?? '');
                $parts = [];
                if (!empty($row['problema'])) $parts[] = "Problema: {$row['problema']}";
                if (!empty($row['causa'])) $parts[] = "Causa: {$row['causa']}";
                if (!empty($row['solucao'])) $parts[] = "Solução: {$row['solucao']}";
                $obs = implode("\n", $parts);

                if (empty($obs)) {
                    $skipped++;
                    $errors[] = ['linha' => $index + 1, 'motivo' => 'Problema, causa e solução vazios'];
                    continue;
                }

                foreach ($matchedEquipments as $equipment) {
                    $existing = $this->ticketRepository->findByOs($row['tarefa']);

                    if ($existing && mb_strtolower($existing->status, 'UTF-8') === 'planejado') {
                        $skipped++;
                        $errors[] = ['linha' => $index + 1, 'motivo' => 'OS com status Planejado ignorada na importação'];
                        continue;
                    }

                    $ticketData = [
                        'equipamento_id' => $equipment->id,
                        'os' => $row['tarefa'],
                        'data' => $date,
                        'equipe' => $row['tecnico'] ?? '',
                        'status' => $status,
                        'data_concluido' => $completionDate,
                        'data_planejada' => null,
                        'material' => $material,
                        'obs' => $obs,
                    ];

                    if ($existing) {
                        $ticketData['id'] = $existing->id;
                        $this->ticketRepository->update($ticketData);
                        $updated++;
                    } else {
                        $this->ticketRepository->save($ticketData);
                        $imported++;
                    }
                }
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = ['linha' => $index + 1, 'motivo' => $e->getMessage()];
            }
        }

        return [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    private function extractSiteCode(string $empresa): ?string
    {
        $parts = explode(' - ', $empresa);
        $code = $parts[1] ?? null;
        if ($code === null) return null;
        return preg_replace('/DTC$/i', '', $code) ?: null;
    }

    private function findMatchingEquipment(array $row, array $equipments): array
    {
        $tag = $row['tag'] ?? '';
        $tag = trim($tag);

        if ($tag !== '' && strtoupper($tag) !== 'NÃO SE APLICA' && strtoupper($tag) !== 'NAO SE APLICA') {
            foreach ($equipments as $eq) {
                if ($eq->equipment === $tag) {
                    return [$eq];
                }
            }
            return [];
        }

        $parts = array_filter([
            $row['solucao'] ?? '',
            $row['problema'] ?? '',
            $row['causa'] ?? '',
        ]);
        $text = implode(' ', $parts);

        $normalizedText = mb_strtoupper($this->normalizeText($text));

        $matched = [];
        foreach ($equipments as $eq) {
            $eqName = mb_strtoupper($eq->equipment);
            if (mb_strpos($normalizedText, $eqName) !== false) {
                $matched[] = $eq;
            }
        }

        return $matched;
    }

    private function normalizeText(string $text): string
    {
        $text = preg_replace('/[^\p{L}\p{N}\s\/-]/u', ' ', $text);
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }

    private function normalizeStatus(string $status): string
    {
        $normalized = trim($status);
        $lower = mb_strtolower($normalized, 'UTF-8');
        if (str_starts_with($lower, 'conclu')) {
            return "Conclu" . "\xc3\xad" . "do";
        }
        if (str_starts_with($lower, 'aguardando aprova') || $lower === 'aguardando aprovacao') {
            return "Conclu" . "\xc3\xad" . "do";
        }
        return $normalized;
    }

    private function parseDate(string $date): ?string
    {
        $date = trim($date);
        if (empty($date)) return null;

        $dt = \DateTime::createFromFormat('d/m/Y H:i:s', $date);
        if ($dt) return $dt->format('Y-m-d');

        $dt = \DateTime::createFromFormat('d/m/Y', $date);
        if ($dt) return $dt->format('Y-m-d');

        return null;
    }

    private function determineMaterial(string $materiais): string
    {
        $materiais = trim($materiais);
        if ($materiais === '' || $materiais === '[]') {
            return 'Não';
        }
        return 'Sim';
    }
}
