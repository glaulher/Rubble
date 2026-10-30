<?php

namespace App\Api\Services;

use App\Api\Repositories\SolicitacaoCompraRepository;

class SolicitacaoCompraService
{
    public const STATUS_FLOW = [
        'em_cotacao',
        'orcamento_recebido',
        'sc_solicitada',
        'sc_aprovada',
        'pc_gerado',
        'material_retirado',
    ];

    public const STATUS_LABELS = [
        'em_cotacao' => 'Em cotação',
        'orcamento_recebido' => 'Orçamento recebido',
        'sc_solicitada' => 'SC solicitada',
        'sc_aprovada' => 'SC aprovada',
        'pc_gerado' => 'PC gerado',
        'material_retirado' => 'Material retirado',
    ];

    public const EDITABLE_FIELDS = [
        'titulo_email',
        'status',
        'site',
        'equipamento_id',
        'equipamento_texto',
        'numero_sc',
        'numero_pc',
        'numero_pv',
        'valor_sc',
        'data',
        'data_status',
        'sla_dias',
        'observacao',
    ];

    private SolicitacaoCompraRepository $repository;

    public function __construct(?SolicitacaoCompraRepository $repository = null)
    {
        $this->repository = $repository ?? new SolicitacaoCompraRepository();
    }

    /*
    |--------------------------------------------------------------------------
    | LISTAGEM
    |--------------------------------------------------------------------------
    */

    /**
     * @return array{items: array, total: int, status_counts: array}
     */
    public function listAll(
        int $limit,
        int $offset,
        string $search = '',
        ?string $status = null,
        ?string $site = null
    ): array {
        $rows = $this->repository->listAll($limit, $offset, $search, $status, $site);

        return [
            'items' => array_map(fn (array $row) => $this->enrich($row), $rows),
            'total' => $this->repository->count($search, $status, $site),
            'status_counts' => $this->repository->statusCounts(),
        ];
    }

    public function getById(int $id): ?array
    {
        $row = $this->repository->getById($id);

        return $row === null ? null : $this->enrich($row);
    }

    /*
    |--------------------------------------------------------------------------
    | ESCRITA
    |--------------------------------------------------------------------------
    */

    public function save(array $data): int
    {
        $payload = $this->normalizePayload($data);
        $payload['data'] ??= date('Y-m-d');
        $payload['data_status'] ??= $payload['data'];

        $this->validate($payload);

        $this->assertUniqueScNumber($payload['numero_sc'] ?? null);

        return $this->repository->save($payload);
    }

    public function update(int $id, array $data): bool
    {
        $current = $this->repository->getById($id);
        if ($current === null) {
            throw new \InvalidArgumentException('Solicitação não encontrada.');
        }

        $payload = $this->normalizePayload($data);

        $statusChanged = array_key_exists('status', $payload)
            && (string) $payload['status'] !== (string) ($current['status'] ?? '');

        if ($statusChanged && !array_key_exists('data_status', $payload)) {
            $payload['data_status'] = date('Y-m-d');
        }

        $merged = array_merge($this->editableValues($current), $payload);

        $this->validate($merged, true);

        $this->assertUniqueScNumber($payload['numero_sc'] ?? null, $id);

        return $this->repository->update($id, $merged);
    }

    public function updateField(int $id, string $field, mixed $value): array
    {
        if (!in_array($field, self::EDITABLE_FIELDS, true)) {
            throw new \InvalidArgumentException('Campo não editável.');
        }

        $this->update($id, [$field => $value]);

        $row = $this->repository->getById($id);
        if ($row === null) {
            throw new \InvalidArgumentException('Solicitação não encontrada.');
        }

        return $this->enrich($row);
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDAÇÃO
    |--------------------------------------------------------------------------
    */

    public function validate(array $data, bool $isUpdate = false): array
    {
        if (trim((string) ($data['titulo_email'] ?? '')) === '') {
            throw new \InvalidArgumentException('O título da solicitação é obrigatório.');
        }

        if (trim((string) ($data['site'] ?? '')) === '') {
            throw new \InvalidArgumentException('O site é obrigatório.');
        }

        if (!in_array((string) ($data['status'] ?? ''), self::STATUS_FLOW, true)) {
            throw new \InvalidArgumentException('Status inválido.');
        }

        $valorSc = $data['valor_sc'] ?? null;
        if ($valorSc !== null && $valorSc !== '') {
            if (!is_numeric($valorSc) || (float) $valorSc < 0) {
                throw new \InvalidArgumentException('Valor da SC deve ser um número maior ou igual a zero.');
            }
        }

        $sla = $data['sla_dias'] ?? null;
        if ($sla !== null && $sla !== '') {
            if (!is_numeric($sla) || (float) $sla < 0 || (float) $sla != (int) $sla) {
                throw new \InvalidArgumentException('SLA deve ser um número inteiro de dias maior ou igual a zero.');
            }
        }

        foreach (['data', 'data_status'] as $dateField) {
            $value = $data[$dateField] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            if (!self::isValidDate((string) $value)) {
                throw new \InvalidArgumentException('Data inválida.');
            }
        }

        return $data;
    }

    /*
    |--------------------------------------------------------------------------
    | ENRIQUECIMENTO (derivados de exibição)
    |--------------------------------------------------------------------------
    */

    public function enrich(array $row, ?string $today = null): array
    {
        $today ??= date('Y-m-d');

        $margins = self::computeMargins(
            self::toFloat($row['valor_sc'] ?? null),
            self::toFloat($row['pv_valor_total'] ?? null)
        );

        $row['steps'] = self::stepsFor($row['status'] ?? null);
        $row['markup_pct'] = $margins['markup_pct'];
        $row['margem_pct'] = $margins['margem_pct'];
        $row['overdue_days'] = self::overdueDays($row, $today);

        return $row;
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS / MARGENS / SLA
    |--------------------------------------------------------------------------
    */

    public static function statusIndex(?string $status): int
    {
        $index = array_search($status, self::STATUS_FLOW, true);

        return $index === false ? -1 : (int) $index;
    }

    /**
     * @return array<string, bool> chave do status => etapa já cumprida
     */
    public static function stepsFor(?string $status): array
    {
        $current = self::statusIndex($status);

        $steps = [];
        foreach (self::STATUS_FLOW as $index => $key) {
            $steps[$key] = $index <= $current;
        }

        return $steps;
    }

    /**
     * @return array{markup_pct: ?float, margem_pct: ?float}
     */
    public static function computeMargins(?float $valorSc, ?float $valorPv): array
    {
        $margins = ['markup_pct' => null, 'margem_pct' => null];

        if ($valorSc === null || $valorPv === null) {
            return $margins;
        }

        if ($valorSc > 0) {
            $margins['markup_pct'] = round((($valorPv - $valorSc) / $valorSc) * 100, 1);
        }

        if ($valorPv > 0) {
            $margins['margem_pct'] = round((($valorPv - $valorSc) / $valorPv) * 100, 1);
        }

        return $margins;
    }

    public static function overdueDays(array $row, string $today): int
    {
        $sla = $row['sla_dias'] ?? null;
        $dataStatus = $row['data_status'] ?? null;

        if ($sla === null || $sla === '' || $dataStatus === null || $dataStatus === '') {
            return 0;
        }

        $todayTs = strtotime($today);
        $statusTs = strtotime((string) $dataStatus);

        if ($todayTs === false || $statusTs === false) {
            return 0;
        }

        $days = (int) round(($todayTs - $statusTs) / 86400);
        $overdue = $days - (int) $sla;

        return $overdue > 0 ? $overdue : 0;
    }

    /*
    |--------------------------------------------------------------------------
    | INTERNOS
    |--------------------------------------------------------------------------
    */

    private function normalizePayload(array $data): array
    {
        $normalized = [];

        foreach (self::EDITABLE_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];

            if ($field === 'numero_pv') {
                $digits = preg_replace('/\D/', '', (string) ($value ?? ''));
                $normalized[$field] = $digits === '' ? null : $digits;
                continue;
            }

            if (is_string($value)) {
                $value = trim($value);
                $normalized[$field] = $value === '' ? null : $value;
                continue;
            }

            $normalized[$field] = $value;
        }

        return $normalized;
    }

    private function editableValues(array $row): array
    {
        $values = [];

        foreach (self::EDITABLE_FIELDS as $field) {
            $values[$field] = $row[$field] ?? null;
        }

        return $values;
    }

    private function assertUniqueScNumber(?string $numeroSc, ?int $ignoreId = null): void
    {
        if ($numeroSc === null || $numeroSc === '') {
            return;
        }

        if ($this->repository->existsByScNumber($numeroSc, $ignoreId)) {
            throw new \InvalidArgumentException('Já existe uma solicitação com esse número de SC.');
        }
    }

    private static function isValidDate(string $value): bool
    {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts)) {
            return false;
        }

        return checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
    }

    private static function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
