<?php

namespace App\Api\Services;

use App\Api\Entities\EstoqueMaterial;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Config\Database;

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
        'data_saida',
        'tecnico_nome',
        'numero_os',
        'site',
        'equipamento_id',
        'equipamento_texto',
        'numero_pv',
        'pv_item_id',
        'preco_venda',
        'observacoes',
    ];

    private EstoqueMaterialRepository $repository;

    public function __construct(?EstoqueMaterialRepository $repository = null)
    {
        $this->repository = $repository ?? new EstoqueMaterialRepository();
    }

    public function listAll(
        int $limit = 50,
        int $offset = 0,
        string $search = '',
        ?string $status = null,
        ?string $comPv = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        $rows = $this->repository->listAll($limit, $offset, $search, $status, $comPv, $sortBy, $sortDir);
        $total = $this->repository->count($search, $status, $comPv);
        $statusCounts = $this->repository->statusCounts();
        $totals = $this->repository->getTotals($search, $status, $comPv);

        return [
            'items' => array_map(fn (array $row) => (new EstoqueMaterial($row))->toArray(), $rows),
            'total' => $total,
            'status_counts' => $statusCounts,
            'totals' => $totals,
        ];
    }

    public function getTotals(string $search = '', ?string $status = null, ?string $comPv = null): array
    {
        return $this->repository->getTotals($search, $status, $comPv);
    }

    public function getById(int $id): ?array
    {
        $row = $this->repository->getById($id);

        return $row === null ? null : (new EstoqueMaterial($row))->toArray();
    }

    public function save(array $data): int
    {
        $payload = $this->enforceEquipmentXor($this->normalizePayload($data), $data);
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
        $payload = $this->enforceEquipmentXor($this->normalizePayload($data), $data);

        if (array_key_exists('material_descricao', $payload) && trim((string) $payload['material_descricao']) === '') {
            throw new \InvalidArgumentException('Material é obrigatório.');
        }
        if (array_key_exists('site', $payload) && trim((string) $payload['site']) === '') {
            throw new \InvalidArgumentException('Site é obrigatório.');
        }
        if (array_key_exists('quantidade', $payload) && (float) $payload['quantidade'] <= 0) {
            throw new \InvalidArgumentException('Quantidade deve ser maior que zero.');
        }

        return $this->repository->update($id, $payload);
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
            throw new \InvalidArgumentException('Site é obrigatório.');
        }
        if ($field === 'quantidade' && (float) $value <= 0) {
            throw new \InvalidArgumentException('Quantidade deve ser maior que zero.');
        }

        if ($field === 'equipamento_id') {
            $eqId = ($value !== null && $value !== '') ? (int) $value : null;
            $this->repository->updateField($id, 'equipamento_id', $eqId);
            $this->repository->updateField($id, 'equipamento_texto', null);
        } elseif ($field === 'equipamento_texto') {
            $eqTxt = ($value !== null && trim((string) $value) !== '') ? trim((string) $value) : null;
            $this->repository->updateField($id, 'equipamento_texto', $eqTxt);
            $this->repository->updateField($id, 'equipamento_id', null);
        } else {
            $this->repository->updateField($id, $field, $value);
        }

        $updated = $this->getById($id);
        if ($updated === null) {
            throw new \RuntimeException('Item não encontrado após atualização.');
        }

        return $updated;
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function getPvItems(string $numeroPv): array
    {
        $digits = preg_replace('/\D/', '', $numeroPv);
        if ($digits === '') {
            return [];
        }

        $conn = Database::connect();
        $sql = "SELECT pi.id, pi.numero_item, pi.descricao, pi.descricao_lpu,
                       pi.quantidade, pi.valor, pi.valor_total, pi.status
                FROM pv_item pi
                JOIN pv p ON p.id = pi.pv_id
                WHERE p.numero_pv = ?
                ORDER BY pi.numero_item ASC, pi.id ASC";

        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            return [];
        }

        $stmt->bind_param('s', $digits);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $desc = !empty(trim((string) $row['descricao']))
                ? trim((string) $row['descricao'])
                : trim((string) $row['descricao_lpu']);

            $items[] = [
                'id' => (int) $row['id'],
                'numero_item' => $row['numero_item'] !== null ? (int) $row['numero_item'] : null,
                'descricao' => $desc,
                'quantidade' => (float) ($row['quantidade'] ?? 1),
                'valor' => (float) ($row['valor'] ?? 0),
                'valor_total' => (float) ($row['valor_total'] ?? 0),
                'status' => (string) ($row['status'] ?? ''),
            ];
        }

        return $items;
    }

    public function exportCsv(
        string $search = '',
        ?string $status = null,
        ?string $comPv = null
    ): string {
        $rows = $this->repository->listAll(10000, 0, $search, $status, $comPv, 'id', 'DESC');

        $headers = [
            'Status',
            'Material',
            'Qtd',
            'Unidade',
            'Preço Compra Unit.',
            'Total Compra',
            'Data Entrada',
            'Fornecedor / NF',
            'Data Saída',
            'Técnico',
            'OS',
            'Site',
            'Equipamento',
            'PV',
            'Item PV',
            'Preço Venda Unit.',
            'Total Venda',
            'Lucro Bruto',
            '% Margem',
            '% Markup',
            'Observações',
        ];

        $output = "\xEF\xBB\xBF"; // UTF-8 BOM
        $output .= implode(';', array_map([self::class, 'escapeCsvCell'], $headers)) . "\r\n";

        foreach ($rows as $row) {
            $entity = (new EstoqueMaterial($row))->toArray();

            $statusLabel = self::STATUSES[$entity['status']] ?? $entity['status'];
            $equipamentoExibicao = !empty($entity['equipamento'])
                ? $entity['equipamento']
                : ($entity['equipamento_texto'] ?? '');

            $line = [
                $statusLabel,
                $entity['material_descricao'],
                number_format((float) $entity['quantidade'], 2, ',', ''),
                $entity['unidade'],
                number_format((float) $entity['preco_compra'], 2, ',', '.'),
                number_format((float) $entity['total_compra'], 2, ',', '.'),
                $entity['data_entrada'] ? date('d/m/Y', strtotime($entity['data_entrada'])) : '',
                $entity['fornecedor_nf'] ?? '',
                $entity['data_saida'] ? date('d/m/Y', strtotime($entity['data_saida'])) : '',
                $entity['tecnico_nome'] ?? '',
                $entity['numero_os'] ?? '',
                $entity['site'],
                $equipamentoExibicao,
                $entity['numero_pv'] ?? '',
                $entity['pv_item_descricao'] ?? '',
                $entity['preco_venda'] !== null ? number_format((float) $entity['preco_venda'], 2, ',', '.') : '',
                $entity['total_venda'] !== null ? number_format((float) $entity['total_venda'], 2, ',', '.') : '',
                $entity['lucro_bruto'] !== null ? number_format((float) $entity['lucro_bruto'], 2, ',', '.') : '',
                $entity['margem_percent'] !== null ? number_format((float) $entity['margem_percent'], 2, ',', '') . '%' : '',
                $entity['markup_percent'] !== null ? number_format((float) $entity['markup_percent'], 2, ',', '') . '%' : '',
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
            throw new \InvalidArgumentException('Site é obrigatório.');
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

    private function enforceEquipmentXor(array $values, array $payload): array
    {
        if (array_key_exists('equipamento_id', $payload) && !empty($payload['equipamento_id'])) {
            $values['equipamento_id'] = (int) $payload['equipamento_id'];
            $values['equipamento_texto'] = null;
        } elseif (array_key_exists('equipamento_texto', $payload) && trim((string) $payload['equipamento_texto']) !== '') {
            $values['equipamento_texto'] = trim((string) $payload['equipamento_texto']);
            $values['equipamento_id'] = null;
        }

        return $values;
    }
}
