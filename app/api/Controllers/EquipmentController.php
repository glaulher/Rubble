<?php

namespace App\Api\Controllers;

use App\Api\Services\EquipmentService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Cache;
use Exception;

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

            $offset =
                (int) ($_GET['offset'] ?? 0);

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

            /*
            |------------------------------------------------------------------
            | CACHE CHECK
            |------------------------------------------------------------------
            */
            $cacheKey = Cache::buildKey('equipment', [
                'search' => $search,
                'page' => $limit > 0 ? intdiv($offset, $limit) : 0,
                'limit' => $limit,
                'location' => $location,
                'equipamento' => $equipamento,
            ]);

            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                Response::json($cached);
            }

            /*
            |------------------------------------------------------------------
            | SERVICE
            |------------------------------------------------------------------
            */
            $data =
                $this->service->listAll(
                    $limit,
                    $offset,
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

                'limit' => $limit,

                'offset' => $offset,
            ];

            Cache::set($cacheKey, $response, 10);

            Response::json($response);

        } catch (Exception $e) {

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

        } catch (Exception $e) {

            Response::serverError($e);
        }
    }
}
