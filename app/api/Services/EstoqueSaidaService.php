<?php

namespace App\Api\Services;

use App\Api\Entities\EstoqueSaida;
use App\Api\Repositories\EstoqueMaterialRepository;
use App\Api\Repositories\EstoqueSaidaRepository;
use App\Config\Database;

class EstoqueSaidaService
{
    public const EDITABLE_FIELDS = [
        'estoque_material_id',
        'quantidade_saida',
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

    private EstoqueSaidaRepository $repository;
    private EstoqueMaterialRepository $materialRepository;

    public function __construct(
        ?EstoqueSaidaRepository $repository = null,
        ?EstoqueMaterialRepository $materialRepository = null
    ) {
        $this->repository = $repository ?? new EstoqueSaidaRepository();
        $this->materialRepository = $materialRepository ?? new EstoqueMaterialRepository();
    }

    public function listAll(
        int $limit = 50,
        int $offset = 0,
        string $search = '',
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null,
        string $sortBy = 'id',
        string $sortDir = 'DESC'
    ): array {
        $rows = $this->repository->listAll($limit, $offset, $search, $materialId, $site, $comPv, $sortBy, $sortDir);
        $total = $this->repository->count($search, $materialId, $site, $comPv);
        $totals = $this->repository->getTotals($search, $materialId, $site, $comPv);

        return [
            'items' => array_map(fn (array $row) => (new EstoqueSaida($row))->toArray(), $rows),
            'total' => $total,
            'totals' => $totals,
        ];
    }

    public function getTotals(
        string $search = '',
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null
    ): array {
        return $this->repository->getTotals($search, $materialId, $site, $comPv);
    }

    public function getById(int $id): ?array
    {
        $row = $this->repository->getById($id);

        return $row === null ? null : (new EstoqueSaida($row))->toArray();
    }

    public function getByMaterialId(int $materialId): array
    {
        $rows = $this->repository->getByMaterialId($materialId);

        return array_map(fn (array $row) => (new EstoqueSaida($row))->toArray(), $rows);
    }

    public function save(array $data): int
    {
        $payload = $this->enforceEquipmentXor($this->normalizePayload($data), $data);
        $payload['data_saida'] ??= date('Y-m-d');

        $this->validate($payload);

        $materialId = (int) $payload['estoque_material_id'];
        $material = $this->materialRepository->getById($materialId);
        if ($material === null) {
            throw new \InvalidArgumentException('Material de estoque de origem não encontrado.');
        }

        $qtdSaida = (float) $payload['quantidade_saida'];
        $saldoDisponivel = (float) ($material['quantidade_disponivel'] ?? 0);

        if ($qtdSaida > ($saldoDisponivel + 0.0001)) {
            throw new \InvalidArgumentException(
                "Quantidade solicitada ({$qtdSaida}) excede o saldo disponível em estoque ({$saldoDisponivel})."
            );
        }

        $id = $this->repository->save($payload);
        $this->materialRepository->syncStatus($materialId);

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $current = $this->repository->getById($id);
        if ($current === null) {
            throw new \InvalidArgumentException('Saída de material não encontrada.');
        }

        $payload = $this->enforceEquipmentXor($this->normalizePayload($data), $data);

        $materialId = (int) ($payload['estoque_material_id'] ?? $current['estoque_material_id']);
        $material = $this->materialRepository->getById($materialId);
        if ($material === null) {
            throw new \InvalidArgumentException('Material de estoque não encontrado.');
        }

        if (array_key_exists('quantidade_saida', $payload)) {
            $novaQtd = (float) $payload['quantidade_saida'];
            if ($novaQtd <= 0) {
                throw new \InvalidArgumentException('Quantidade de saída deve ser maior que zero.');
            }

            $outrasSaidas = $this->repository->sumSaidasByMaterialId($materialId, $id);
            $saldoMaximoPermitido = round((float) $material['quantidade'] - $outrasSaidas, 2);

            if ($novaQtd > ($saldoMaximoPermitido + 0.0001)) {
                throw new \InvalidArgumentException(
                    "Quantidade solicitada ({$novaQtd}) excede o saldo disponível ({$saldoMaximoPermitido})."
                );
            }
        }

        if (array_key_exists('site', $payload) && trim((string) $payload['site']) === '') {
            throw new \InvalidArgumentException('Site de aplicação é obrigatório.');
        }

        $updated = $this->repository->update($id, $payload);
        if ($updated) {
            $this->materialRepository->syncStatus($materialId);
            if ($materialId !== (int) $current['estoque_material_id']) {
                $this->materialRepository->syncStatus((int) $current['estoque_material_id']);
            }
        }

        return $updated;
    }

    public function delete(int $id): bool
    {
        $current = $this->repository->getById($id);
        if ($current === null) {
            return false;
        }

        $materialId = (int) $current['estoque_material_id'];
        $deleted = $this->repository->delete($id);

        if ($deleted) {
            $this->materialRepository->syncStatus($materialId);
        }

        return $deleted;
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
                'quantidade' => (float) $row['quantidade'],
                'valor' => (float) $row['valor'],
                'valor_total' => (float) $row['valor_total'],
                'status' => $row['status'],
            ];
        }

        return $items;
    }

    public function exportCsv(
        string $search = '',
        ?int $materialId = null,
        ?string $site = null,
        ?string $comPv = null
    ): string {
        $rows = $this->repository->listAll(10000, 0, $search, $materialId, $site, $comPv, 'id', 'DESC');

        $headers = [
            'Data Saída',
            'Material / Descrição',
            'Qtd Saída',
            'Unidade',
            'Preço Compra Unit.',
            'Total Compra',
            'Preço Venda Unit.',
            'Total Venda',
            'Lucro Bruto',
            '% Margem',
            '% Markup',
            'Site de Destino',
            'Equipamento',
            'Técnico',
            'Número OS',
            'Número PV',
            'Item PV',
            'Observações',
        ];

        $output = "\xEF\xBB\xBF"; // UTF-8 BOM
        $output .= implode(';', array_map([self::class, 'escapeCsvCell'], $headers)) . "\r\n";

        foreach ($rows as $row) {
            $entity = (new EstoqueSaida($row))->toArray();
            $equipamentoExibicao = !empty($entity['equipamento'])
                ? $entity['equipamento']
                : ($entity['equipamento_texto'] ?? '');

            $line = [
                $entity['data_saida'] ? date('d/m/Y', strtotime($entity['data_saida'])) : '',
                $entity['material_descricao'] ?? '',
                number_format((float) $entity['quantidade_saida'], 2, ',', ''),
                $entity['unidade'] ?? 'UN',
                number_format((float) $entity['preco_compra'], 2, ',', '.'),
                number_format((float) $entity['total_compra'], 2, ',', '.'),
                $entity['preco_venda'] !== null ? number_format((float) $entity['preco_venda'], 2, ',', '.') : '',
                $entity['total_venda'] !== null ? number_format((float) $entity['total_venda'], 2, ',', '.') : '',
                $entity['lucro_bruto'] !== null ? number_format((float) $entity['lucro_bruto'], 2, ',', '.') : '',
                $entity['margem_percent'] !== null ? number_format((float) $entity['margem_percent'], 2, ',', '') . '%' : '',
                $entity['markup_percent'] !== null ? number_format((float) $entity['markup_percent'], 2, ',', '') . '%' : '',
                $entity['site'],
                $equipamentoExibicao,
                $entity['tecnico_nome'] ?? '',
                $entity['numero_os'] ?? '',
                $entity['numero_pv'] ?? '',
                $entity['pv_item_descricao'] ?? '',
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
        $materialId = (int) ($data['estoque_material_id'] ?? 0);
        if ($materialId <= 0) {
            throw new \InvalidArgumentException('Material de estoque é obrigatório.');
        }

        if (empty(trim((string) ($data['site'] ?? '')))) {
            throw new \InvalidArgumentException('Site de aplicação é obrigatório.');
        }

        if (empty(trim((string) ($data['data_saida'] ?? '')))) {
            throw new \InvalidArgumentException('Data de saída é obrigatória.');
        }

        $qtd = (float) ($data['quantidade_saida'] ?? 0);
        if ($qtd <= 0) {
            throw new \InvalidArgumentException('Quantidade de saída deve ser maior que zero.');
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
