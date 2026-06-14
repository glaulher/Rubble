<?php

namespace App\Api\Controllers;

use App\Api\Services\EquipmentService;
use App\Api\Services\TicketService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Cache;

class EquipmentController
{
    private EquipmentService $service;

    public function __construct()
    {
        $this->service =
            new EquipmentService();
    }

    /*
    |--------------------------------------------------------------------------
    | LIST EQUIPMENT
    |--------------------------------------------------------------------------
    */
    public function listAll(): void
    {
        try {

            $limit =
                (int) ($_GET['limit'] ?? 20);

            $search =
                trim($_GET['search'] ?? '');

            $location =
                isset($_GET['local']) && $_GET['local'] !== ''
                    ? $_GET['local']
                    : null;

            $equipamento =
                isset($_GET['equipamento']) && $_GET['equipamento'] !== ''
                    ? $_GET['equipamento']
                    : null;

            $keyset = null;
            if (
                isset($_GET['last_local']) &&
                isset($_GET['last_equipamento']) &&
                isset($_GET['last_id'])
            ) {
                $keyset = [
                    'local' => $_GET['last_local'],
                    'equipamento' => $_GET['last_equipamento'],
                    'id' => (int) $_GET['last_id'],
                ];
            }

            $cacheKey = 'equipment_list:' . md5(serialize([
                $limit, $keyset, $search, $location, $equipamento
            ]));

            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                Response::json($cached);
                return;
            }

            /*
            |------------------------------------------------------------------
            | SERVICE
            |------------------------------------------------------------------
            */
            $data =
                $this->service->listAll(
                    $limit,
                    $keyset,
                    $search,
                    $location,
                    $equipamento
                );

            $response = [
                'success' => true,
                'message' =>
                    'Equipamentos listados com sucesso',
                'data' =>
                    $data['items'],
                'total' =>
                    $data['total'],
                'total_os' =>
                    $data['total_os'],
                'total_valor' =>
                    $data['total_valor'],
                'limit' => $limit,
                '_hash' => md5(serialize($data['items'])),
            ];

            Cache::set($cacheKey, $response, 10);

            Response::json($response);

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK CHILLER
    |--------------------------------------------------------------------------
    */

    public function checkChiller(): void
    {
        try {

            $location =
                $_GET['local'] ?? '';

            if (empty($location)) {

                Response::error(
                    'Local obrigatório',
                    400
                );
                return;
            }

            $hasChiller =
                $this->service->hasChiller(
                    $location
                );

            Response::json([
                'success' => true,
                'data' => [
                    'has_chiller' => $hasChiller,
                ],
            ]);

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LIST TICKETS BY EQUIPMENT (lazy load)
    |--------------------------------------------------------------------------
    */
    public function ticketsByEquipment(): void
    {
        try {

            $equipId = (int) ($_GET['id'] ?? 0);

            if ($equipId <= 0) {

                Response::error('ID do equipamento obrigatório', 400);
            }

            $service = new TicketService();
            $tickets = $service->listByItem($equipId);

            Response::json([
                'success' => true,
                'data' => $tickets,
            ]);

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LIST TICKETS BY EQUIPMENT IDS (batch for CSV export)
    |--------------------------------------------------------------------------
    */
    public function ticketsByIds(): void
    {
        try {

            $ids = isset($_GET['ids']) ? (array) $_GET['ids'] : [];

            $ids = array_map('intval', $ids);
            $ids = array_filter($ids, fn($v) => $v > 0);

            if (empty($ids)) {

                Response::error('IDs dos equipamentos obrigatórios', 400);
                return;
            }

            $service = new TicketService();
            $result = $service->listByItems($ids);

            Response::json([
                'success' => true,
                'data' => $result,
            ]);

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SUM VALUE BY FILTER (badge)
    |--------------------------------------------------------------------------
    */
    public function sumValue(): void
    {
        try {

            $search =
                trim($_GET['search'] ?? '');

            $location =
                isset($_GET['local']) && $_GET['local'] !== ''
                    ? $_GET['local']
                    : null;

            $cacheKey = 'equipment_sum:' . md5(serialize([
                $search, $location
            ]));

            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                Response::json($cached);
                return;
            }

            $priceRepo = new \App\Api\Repositories\EquipmentPriceRepository();
            $totalValor = $priceRepo->sumValueByFilter($search, $location);
            $totalEquipment = $priceRepo->countByFilter($search, $location);

            $response = [
                'success' => true,
                'total_valor' => $totalValor,
                'total_equipment' => $totalEquipment,
            ];

            Cache::set($cacheKey, $response, 30);

            Response::json($response);

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }
}
