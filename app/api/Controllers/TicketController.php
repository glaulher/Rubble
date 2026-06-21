<?php

namespace App\Api\Controllers;

use App\Api\Services\TicketService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;
use App\Api\Helpers\Cache;
use Exception;

class TicketController
{
    private TicketService $service;

    public function __construct()
    {
        $this->service = new TicketService();
    }

    /*
    |--------------------------------------------------------------------------
    | LIST
    |--------------------------------------------------------------------------
    */

    public function listByItem(): void
    {
        try {

            $id = Request::get('item');

            if (!$id) {

                Response::error(
                    'Parâmetro item obrigatório',
                    400
                );
                return;
            }

            $data =
                $this->service->listByItem(
                    (int) $id
                );

            Response::success(
                'Registros listados com sucesso',
                $data
            );

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    public function save(): void
    {
        try {

            $data =
                Request::body();

            Validator::required($data, [
                'equipamento_id',
                'status',
                'os',
                'data',
                'equipe',
            ]);

            Validator::integer(
                $data,
                'equipamento_id'
            );

            Validator::max(
                $data,
                'obs',
                1000
            );

            $id =
                $this->service->save(
                    $data
                );

            Cache::deleteByPrefix('equipment_list:');

            Response::success(
                'Registro salvo com sucesso',
                ['id' => $id],
                201
            );

        } catch (\Exception $e) {

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(): void
    {
        try {

            $data =
                Request::body();

            Validator::required($data, [
                'id',
                'equipamento_id',
                'status',
                'os',
                'data',
                'equipe',
            ]);

            Validator::integer(
                $data,
                'id'
            );

            $this->service->update(
                $data
            );

            Cache::deleteByPrefix('equipment_list:');

            Response::success(
                'Registro atualizado com sucesso'
            );

        } catch (\Exception $e) {

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | GET BY ID
    |--------------------------------------------------------------------------
    */


    public function getById(): void
    {
        try {

            $id = Request::get('id');

            if (!$id) {

                Response::error(
                    'ID obrigatório',
                    400
                );
                return;
            }

            $data =
                $this->service->getById(
                    (int) $id
                );

            Response::success(
                'Registro encontrado',
                $data
            );

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORT OS FROM CSV
    |--------------------------------------------------------------------------
    */

    public function import(): void
    {
        try {
            $data = Request::body();

            if (empty($data) || !is_array($data)) {
                Response::validation('Dados de importação inválidos');
            }

            $result = $this->service->importBatch($data);

            $message = "{$result['imported']} importada(s), {$result['updated']} atualizada(s), {$result['skipped']} pulada(s)";

            Response::success($message, $result);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */



    public function delete(): void
    {
        try {

            $data =
                Request::body();

            Validator::required($data, [
                'id'
            ]);

            Validator::integer(
                $data,
                'id'
            );

            $this->service->delete(
                (int) $data['id']
            );

            Cache::deleteByPrefix('equipment_list:');

            Response::success(
                'Registro excluído com sucesso'
            );

        } catch (\Exception $e) {

            $message = $e->getMessage();
            if (str_contains($message, 'foreign key constraint')) {
                error_log("Delete FK error: " . $e->getMessage());
                Response::error('Não é possível excluir: existem PVs vinculados a este registro. Exclua a PV primeiro.', 400);
                return;
            }

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            $message = $e->getMessage();
            if (str_contains($message, 'foreign key constraint')) {
                error_log("Delete FK error: " . $e->getMessage());
                Response::error('Não é possível excluir: existem PVs vinculados a este registro. Exclua a PV primeiro.', 400);
                return;
            }

            Response::serverError($e, 400);
        }
    }
}