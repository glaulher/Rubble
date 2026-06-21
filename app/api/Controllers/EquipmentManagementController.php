<?php

namespace App\Api\Controllers;

use App\Api\Services\EquipmentManagementService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;
use App\Api\Helpers\Cache;
use Exception;

class EquipmentManagementController
{
    private EquipmentManagementService $service;

    public function __construct()
    {
        $this->service = new EquipmentManagementService();
    }

    public function listAll(): void
    {
        try {
            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);
            $search = trim($_GET['search'] ?? '');

            $data = $this->service->listAll($search, $limit, $offset);

            Response::json([
                'success' => true,
                'message' => 'Equipamentos listados com sucesso',
                'data' => $data['items'],
                'total' => $data['total'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getById(): void
    {
        try {
            $id = Request::get('id');
            if (!$id) {
                Response::error('ID obrigatório', 400);
                return;
            }

            $data = $this->service->getById((int)$id);
            if (!$data) {
                Response::notFound('Equipamento não encontrado');
                return;
            }

            Response::success('Equipamento encontrado', $data);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    public function save(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, [
                'equipamento', 'local', 'localidade',
                'local_do_endereco', 'endereco', 'uf', 'mercado',
            ]);

            if (!empty($data['capacidade'])) {
                Validator::integer($data, 'capacidade');
            }

            if (strlen($data['uf']) !== 2) {
                Response::error('UF deve ter 2 caracteres', 400);
                return;
            }

            $id = $this->service->save($data);

            Cache::deleteByPrefix('equipment_list:');
            Cache::deleteByPrefix('equipment_sum:');

            Response::success('Equipamento cadastrado com sucesso', ['id' => $id], 201);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function update(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, [
                'id', 'equipamento', 'local', 'localidade',
                'local_do_endereco', 'endereco', 'uf', 'mercado',
            ]);
            Validator::integer($data, 'id');

            if (strlen($data['uf']) !== 2) {
                Response::error('UF deve ter 2 caracteres', 400);
                return;
            }

            $this->service->update((int)$data['id'], $data);

            Cache::deleteByPrefix('equipment_list:');
            Cache::deleteByPrefix('equipment_sum:');

            Response::success('Equipamento atualizado com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['id']);
            Validator::integer($data, 'id');

            $this->service->delete((int)$data['id']);

            Cache::deleteByPrefix('equipment_list:');
            Cache::deleteByPrefix('equipment_sum:');

            Response::success('Equipamento excluído com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
