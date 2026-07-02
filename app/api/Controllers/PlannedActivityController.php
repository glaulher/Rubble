<?php

namespace App\Api\Controllers;

use App\Api\Services\PlannedActivityService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;
use App\Api\Helpers\Cache;
use Exception;

class PlannedActivityController
{
    private PlannedActivityService $service;
    private object $currentUser;

    public function __construct(?object $currentUser = null)
    {
        $this->service = new PlannedActivityService();
        $this->currentUser = $currentUser ?? (object) [];
    }

    /*
    |--------------------------------------------------------------------------
    | LIST
    |--------------------------------------------------------------------------
    */

    public function listAll(): void
    {
        try {
            $limit = (int) ($_GET['limit'] ?? 20);
            $offset = (int) ($_GET['offset'] ?? 0);
            $search = trim($_GET['search'] ?? '');
            $dateFrom = trim($_GET['date_from'] ?? '') ?: null;
            $dateTo = trim($_GET['date_to'] ?? '') ?: null;
            $status = trim($_GET['status'] ?? '') ?: null;

            $result = $this->service->listAll($limit, $offset, $search, $dateFrom, $dateTo, $status);

            Response::success('Atividades listadas com sucesso', [
                'items' => $result['items'],
                'total' => $result['total'],
            ]);

        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function exportCsv(): void
    {
        try {
            $limit = 99999;
            $offset = 0;
            $search = trim($_GET['search'] ?? '');
            $dateFrom = trim($_GET['date_from'] ?? '') ?: null;
            $dateTo = trim($_GET['date_to'] ?? '') ?: null;
            $status = trim($_GET['status'] ?? '') ?: null;

            $result = $this->service->listAll($limit, $offset, $search, $dateFrom, $dateTo, $status);
            $items = $result['items'] ?? [];

            header('Content-Type: text/csv; charset=Windows-1252');
            header('Content-Disposition: attachment; filename="atividades_planejadas.csv"');

            $output = fopen('php://output', 'w');

            $header = ['LOCAL', 'LOCAL SCM', 'LOCALIDADE', 'EQUIPAMENTO', 'CAPACIDADE', 'OS', 'DATA PLANEJADA', 'STATUS', 'TIPO', 'EQUIPE', 'MATERIAL', 'OBS'];
            fputcsv($output, $header, ';');

            foreach ($items as $item) {
                fputcsv($output, [
                    $item['local'] ?? '',
                    $item['local_scm'] ?? '',
                    $item['localidade'] ?? '',
                    $item['equipamento'] ?? '',
                    $item['capacidade'] ?? '',
                    $item['os'] ?? '',
                    $item['data_planejada'] ?? '',
                    $item['status'] ?? '',
                    $item['tipo'] ?? 'preventiva',
                    $item['equipe'] ?? '',
                    $item['material'] ?? '',
                    $item['obs'] ?? '',
                ], ';');
            }

            fclose($output);

        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | PLAN (Criar ou atualizar para Planejado)
    |--------------------------------------------------------------------------
    */

    public function plan(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, [
                'os',
                'equipamento_id',
                'data_planejada',
            ]);

            Validator::integer($data, 'equipamento_id');

            Validator::max($data, 'obs', 1000);

            $result = $this->service->planActivity($data, (array) $this->currentUser);

            Cache::deleteByPrefix('equipment_list:');

            if ($result['action'] === 'updated') {
                Response::success('OS atualizada para Planejado com sucesso', $result, 200);
            } else {
                Response::success('Atividade planejada com sucesso', $result, 201);
            }

        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE TEAM
    |--------------------------------------------------------------------------
    */

    public function updateTeam(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['id', 'equipe']);
            Validator::integer($data, 'id');

            $result = $this->service->updateTeam($data);

            Cache::deleteByPrefix('equipment_list:');
            Cache::deleteByPrefix('planned_activities:');

            Response::success('Equipe atualizada com sucesso', $result);

        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
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
            $data = Request::body();

            Validator::required($data, ['id']);
            Validator::integer($data, 'id');

            $result = $this->service->delete((int) $data['id']);

            Cache::deleteByPrefix('equipment_list:');

            if ($result['action'] === 'deleted') {
                Response::success('Atividade excluída permanentemente');
            } else {
                Response::success('Atividade desmarcada — registro voltou para Pendente na home');
            }

        } catch (\Exception $e) {
            $message = $e->getMessage();
            if (str_contains($message, 'foreign key constraint')) {
                error_log("Delete FK error: " . $e->getMessage());
                Response::error('Não é possível excluir: existem PVs vinculados a este registro. Exclua a PV primeiro.', 400);
                return;
            }
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }
}
