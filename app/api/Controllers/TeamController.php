<?php

namespace App\Api\Controllers;

use App\Api\Services\TeamService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;
use App\Api\Helpers\Cache;

class TeamController
{
    private TeamService $service;

    public function __construct()
    {
        $this->service = new TeamService();
    }

    public function listAll(): void
    {
        try {
            $limit  = (int) ($_GET['limit'] ?? 9999);
            $offset = (int) ($_GET['offset'] ?? 0);

            $data = $this->service->listAll($limit, $offset);

            Response::json([
                'success' => true,
                'message' => 'Equipes listadas com sucesso',
                'data'    => $data['items'],
                'total'   => $data['total'],
                'limit'   => $limit,
                'offset'  => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function save(): void
    {
        try {
            $data = Request::body();

            if (empty($data['nome']) && empty($data['name'])) {
                Response::error('Nome da equipe é obrigatório', 400);
                return;
            }

            $id = $this->service->save($data);

            Cache::deleteByPrefix('teams_');
            Cache::deleteByPrefix('equipes_');

            Response::success('Equipe cadastrada com sucesso', ['id' => $id], 201);
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

            Validator::required($data, ['id']);
            Validator::integer($data, 'id');

            if (empty($data['nome']) && empty($data['name'])) {
                Response::error('Nome da equipe é obrigatório', 400);
                return;
            }

            $this->service->update((int) $data['id'], $data);

            Cache::deleteByPrefix('teams_');
            Cache::deleteByPrefix('equipes_');

            Response::success('Equipe atualizada com sucesso');
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

            $this->service->delete((int) $data['id']);

            Cache::deleteByPrefix('teams_');
            Cache::deleteByPrefix('equipes_');

            Response::success('Equipe excluída com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
