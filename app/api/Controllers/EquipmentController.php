<?php

namespace App\Api\Controllers;

use App\Api\Services\EquipmentService;
use App\Api\Helpers\Response;
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

            /*
            |------------------------------------------------------------------
            | RESPONSE
            |------------------------------------------------------------------
            */
            Response::json([
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
            ]);

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
