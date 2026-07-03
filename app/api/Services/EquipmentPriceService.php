<?php

namespace App\Api\Services;

use App\Api\Repositories\EquipmentPriceRepository;
use App\Api\Entities\EquipmentPrice;

class EquipmentPriceService
{
    private EquipmentPriceRepository $repository;

    private const ALLOWED_MERCADOS = ['Residencial', 'Empresarial', 'Pessoal'];

    private const RULE_PRIORITY = [
        'chiller_especial' => 1,
        'chiller' => 2,
        'tr' => 3,
    ];

    public function __construct(?EquipmentPriceRepository $repository = null)
    {
        $this->repository = $repository ?? new EquipmentPriceRepository();
    }

    public function listAll(int $limit = 100, int $offset = 0): array
    {
        $items = $this->repository->listAll($limit, $offset);
        return array_map(fn(EquipmentPrice $item) => $item->toArray(), $items);
    }

    public function getById(int $id): ?array
    {
        $item = $this->repository->getById($id);
        return $item ? $item->toArray() : null;
    }

    public function save(array $data): int
    {
        $this->validate($data);
        $data['mercado'] = !empty($data['mercado']) ? $data['mercado'] : null;
        if ($data['mercado'] !== null && !in_array($data['mercado'], self::ALLOWED_MERCADOS, true)) {
            throw new \InvalidArgumentException('Mercado inválido: ' . $data['mercado']);
        }
        return $this->repository->save($data);
    }

    public function update(int $id, array $data): bool
    {
        $this->validate($data);
        $data['mercado'] = !empty($data['mercado']) ? $data['mercado'] : null;
        if ($data['mercado'] !== null && !in_array($data['mercado'], self::ALLOWED_MERCADOS, true)) {
            throw new \InvalidArgumentException('Mercado inválido: ' . $data['mercado']);
        }
        return $this->repository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function getActiveRules(): array
    {
        return $this->repository->getActiveRules(self::RULE_PRIORITY);
    }

    public function resolvePrice(string $equipamento, ?string $local, ?float $capacidade, ?array $rules = null, ?string $mercadoEquipamento = null): float
    {
        $rules ??= $this->getActiveRules();

        if (empty($rules)) {
            return 0.0;
        }

        return $this->matchRule($rules, $equipamento, $local, $mercadoEquipamento, $capacidade ?? 0.0);
    }

    public function getValorCaseSql(): string
    {
        return "CASE
            WHEN e.equipamento LIKE '%chiller%' AND e.local IN ('MCEBC','RJDQC91','TNGBR','CPSCL') THEN 3850.00
            WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Empresarial' THEN 3642.14
            WHEN e.equipamento LIKE '%chiller%' AND e.mercado = 'Pessoal' THEN 3642.14
            WHEN e.mercado = 'Residencial' THEN e.capacidade * 94.00
            ELSE 0
        END";
    }

    private function matchRule(array $rules, string $equipamento, ?string $local, ?string $mercadoEquipamento, float $capacidade): float
    {
        foreach ($rules as $rule) {
            if (!empty($rule['mercado'])) {
                if (empty($mercadoEquipamento) || strtolower($mercadoEquipamento) !== strtolower($rule['mercado'])) {
                    continue;
                }
            }

            if (!empty($rule['equipamento_pattern'])) {
                $pattern = $rule['equipamento_pattern'];
                $regex = '/^' . str_replace(['%', '_'], ['.*', '.'], preg_quote($pattern, '/')) . '$/i';
                if (!preg_match($regex, $equipamento)) {
                    continue;
                }
            }

            if (!empty($rule['locais_especiais'])) {
                $locaisArray = array_map('trim', explode(',', $rule['locais_especiais']));
                if (!in_array($local, $locaisArray, true)) {
                    continue;
                }
            }

            if ($rule['nome'] === 'tr') {
                return round($capacidade * (float) $rule['valor'], 2);
            }
            return (float) $rule['valor'];
        }

        return 0.0;
    }

    private function validate(array $data): void
    {
        if (empty($data['nome'])) {
            throw new \InvalidArgumentException('Nome é obrigatório');
        }

        if (!isset($data['valor']) || $data['valor'] < 0) {
            throw new \InvalidArgumentException('Valor deve ser maior ou igual a zero');
        }
    }
}
