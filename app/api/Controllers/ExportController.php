<?php

namespace App\Api\Controllers;

use App\Api\Services\PvService;
use App\Api\Helpers\Response;

class ExportController
{
    private PvService $service;

    public function __construct()
    {
        $this->service = new PvService();
    }

    /*
    |--------------------------------------------------------------------------
    | CSV EXPORT
    |--------------------------------------------------------------------------
    */

    public function exportCsv(): void
    {
        try {
            $search = trim($_GET['search'] ?? '');
            $status = isset($_GET['status']) && $_GET['status'] !== ''
                ? $_GET['status']
                : null;
            $cycle = isset($_GET['ciclo']) && $_GET['ciclo'] !== ''
                ? $_GET['ciclo']
                : null;

            $pvs = $this->service->listAll(999999, 0, $search, $status, $cycle, 'pv.id', 'ASC');

            $pvIds = array_map(fn($p) => $p['id'], $pvs['items']);
            $itemsGrouped = $this->service->getItemsForExport($pvIds);

            $data = [];
            foreach ($pvs['items'] as $pv) {
                $pvId = $pv['id'];
                $itens = $itemsGrouped[$pvId] ?? [];
                $data[] = [
                    'pv' => $pv,
                    'itens' => $itens,
                ];
            }

            Response::json([
                'success' => true,
                'message' => 'Dados exportados com sucesso',
                'data' => $data,
                'total' => count($data),
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }
}
