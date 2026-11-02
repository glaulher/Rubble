<?php

namespace App\Api\Services;

use App\Api\Entities\EstoqueMaterial;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Api\Repositories\EstoqueSaidaRepository;

class EstoqueMaterialService
{
    public const STATUSES = [
        'em_estoque' => 'Em Estoque',
        'aguardando_chegada' => 'Aguardando Chegada',
        'reservado' => 'Reservado PV',
        'aplicado' => 'Aplicado',
        'devolvido' => 'Devolvido / Sobra',
    ];

    public const EDITABLE_FIELDS = [
        'status',
        'material_descricao',
        'quantidade',
        'unidade',
        'preco_compra',
        'data_entrada',
        'fornecedor_nf',
        'site',
        'observacoes',
    ];

    private EstoqueMaterialRepository $repository;
    private EstoqueSaidaRepository $saidaRepository;

    public function __construct(
        ?EstoqueMaterialRepository $repository = null,
        ?EstoqueSaidaRepository $saidaRepository = null
    ) {
        $this->repository = $repository ?? new EstoqueMaterialRepository();
        $this->saidaRepository = $saidaRepository ?? new EstoqueSaidaRepository();
    }

    public function listAll(
        int $limit = 50,
        int $offset = 0,
        string $search = '',
        ?string $status = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        $rows = $this->repository->listAll($limit, $offset, $search, $status, $sortBy, $sortDir);
        $total = $this->repository->count($search, $status);
        $statusCounts = $this->repository->statusCounts();
        $totals = $this->repository->getTotals($search, $status);

        return [
            'items' => array_map(fn (array $row) => (new EstoqueMaterial($row))->toArray(), $rows),
            'total' => $total,
            'status_counts' => $statusCounts,
            'totals' => $totals,
        ];
    }

    public function getTotals(string $search = '', ?string $status = null): array
    {
        return $this->repository->getTotals($search, $status);
    }

    public function getById(int $id): ?array
    {
        $row = $this->repository->getById($id);

        return $row === null ? null : (new EstoqueMaterial($row))->toArray();
    }

    public function save(array $data): int
    {
        $payload = $this->normalizePayload($data);
        $payload['data_entrada'] ??= date('Y-m-d');
        $payload['status'] ??= 'em_estoque';
        $payload['unidade'] ??= 'UN';
        if (empty(trim((string) ($payload['site'] ?? '')))) {
            $payload['site'] = 'Estoque Central';
        }

        $this->validate($payload);

        return $this->repository->save($payload);
    }

    public function update(int $id, array $data): bool
    {
        $payload = $this->normalizePayload($data);

        if (array_key_exists('material_descricao', $payload) && trim((string) $payload['material_descricao']) === '') {
            throw new \InvalidArgumentException('Material é obrigatório.');
        }
        if (array_key_exists('site', $payload) && trim((string) $payload['site']) === '') {
            throw new \InvalidArgumentException('Site / Almoxarifado é obrigatório.');
        }
        if (array_key_exists('quantidade', $payload) && (float) $payload['quantidade'] <= 0) {
            throw new \InvalidArgumentException('Quantidade deve ser maior que zero.');
        }

        // Valida se a nova quantidade não é inferior ao total já baixado
        if (array_key_exists('quantidade', $payload)) {
            $jaBaixado = $this->saidaRepository->sumSaidasByMaterialId($id);
            $novaQtd = (float) $payload['quantidade'];
            if ($novaQtd < $jaBaixado) {
                throw new \InvalidArgumentException(
                    "A quantidade ({$novaQtd}) não pode ser inferior ao total já baixado em saídas ({$jaBaixado})."
                );
            }
        }

        $updated = $this->repository->update($id, $payload);
        if ($updated) {
            $this->repository->syncStatus($id);
        }

        return $updated;
    }

    public function updateField(int $id, string $field, mixed $value): array
    {
        if (!in_array($field, self::EDITABLE_FIELDS, true)) {
            throw new \InvalidArgumentException("Campo '{$field}' não permitido para edição.");
        }

        if ($field === 'material_descricao' && trim((string) $value) === '') {
            throw new \InvalidArgumentException('Material é obrigatório.');
        }
        if ($field === 'site' && trim((string) $value) === '') {
            throw new \InvalidArgumentException('Site / Almoxarifado é obrigatório.');
        }
        if ($field === 'quantidade') {
            $qtd = (float) $value;
            if ($qtd <= 0) {
                throw new \InvalidArgumentException('Quantidade deve ser maior que zero.');
            }
            $jaBaixado = $this->saidaRepository->sumSaidasByMaterialId($id);
            if ($qtd < $jaBaixado) {
                throw new \InvalidArgumentException(
                    "A quantidade ({$qtd}) não pode ser inferior ao total já baixado ({$jaBaixado})."
                );
            }
        }

        $this->repository->updateField($id, $field, $value);
        $this->repository->syncStatus($id);

        $item = $this->getById($id);
        if ($item === null) {
            throw new \RuntimeException('Item não encontrado após atualização.');
        }

        return $item;
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function exportCsv(string $search = '', ?string $status = null): string
    {
        $rows = $this->repository->listAll(10000, 0, $search, $status, 'id', 'DESC');

        $headers = [
            'Status',
            'Material / Descrição',
            'Qtd Entrada',
            'Qtd Disponível',
            'Qtd Baixada',
            'Unidade',
            'Preço Compra Unit.',
            'Total Compra',
            'Data Entrada',
            'Almoxarifado / Local',
            'Fornecedor / NF',
            'Observações',
        ];

        $output = "\xEF\xBB\xBF"; // UTF-8 BOM
        $output .= implode(';', array_map([self::class, 'escapeCsvCell'], $headers)) . "\r\n";

        foreach ($rows as $row) {
            $entity = (new EstoqueMaterial($row))->toArray();
            $statusLabel = self::STATUSES[$entity['status']] ?? $entity['status'];

            $line = [
                $statusLabel,
                $entity['material_descricao'],
                number_format((float) $entity['quantidade'], 2, ',', ''),
                number_format((float) $entity['quantidade_disponivel'], 2, ',', ''),
                number_format((float) $entity['quantidade_baixada'], 2, ',', ''),
                $entity['unidade'],
                number_format((float) $entity['preco_compra'], 2, ',', '.'),
                number_format((float) $entity['total_compra'], 2, ',', '.'),
                $entity['data_entrada'] ? date('d/m/Y', strtotime($entity['data_entrada'])) : '',
                $entity['site'],
                $entity['fornecedor_nf'] ?? '',
                $entity['observacoes'] ?? '',
            ];

            $output .= implode(';', array_map([self::class, 'escapeCsvCell'], $line)) . "\r\n";
        }

        return $output;
    }

    public static function sanitizeCsvFormula(mixed $value): string
    {
        $str = (string) $value;
        if ($str === '') {
            return '';
        }

        $firstChar = $str[0];
        if (in_array($firstChar, ['=', '+', '-', '@'], true)) {
            return "'" . $str;
        }

        return $str;
    }

    public static function escapeCsvCell(mixed $value): string
    {
        $sanitized = self::sanitizeCsvFormula($value);
        $escaped = str_replace('"', '""', $sanitized);

        return '"' . $escaped . '"';
    }

    private function validate(array $data): void
    {
        if (empty(trim((string) ($data['material_descricao'] ?? '')))) {
            throw new \InvalidArgumentException('Material é obrigatório.');
        }

        if (empty(trim((string) ($data['site'] ?? '')))) {
            throw new \InvalidArgumentException('Site / Almoxarifado é obrigatório.');
        }

        if (empty(trim((string) ($data['data_entrada'] ?? '')))) {
            throw new \InvalidArgumentException('Data de entrada é obrigatória.');
        }

        $qtd = (float) ($data['quantidade'] ?? 0);
        if ($qtd <= 0) {
            throw new \InvalidArgumentException('Quantidade deve ser maior que zero.');
        }

        $preco = (float) ($data['preco_compra'] ?? 0);
        if ($preco < 0) {
            throw new \InvalidArgumentException('Preço de compra não pode ser negativo.');
        }
    }

    private function normalizePayload(array $data): array
    {
        $normalized = [];

        foreach (self::EDITABLE_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];

            if (is_string($value)) {
                $value = trim($value);
                $normalized[$field] = $value === '' ? null : $value;
                continue;
            }

            $normalized[$field] = $value;
        }

        return $normalized;
    }
}
