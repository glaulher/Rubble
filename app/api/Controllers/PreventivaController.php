<?php

namespace App\Api\Controllers;

use App\Api\Services\PreventivaService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;

class PreventivaController
{
    private PreventivaService $service;
    private object $currentUser;

    public function __construct(?object $currentUser = null)
    {
        $this->service = new PreventivaService();
        $this->currentUser = $currentUser ?? (object) [];
    }

    public function plan(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['site', 'data_planejada']);
            Validator::max($data, 'obs', 1000);

            $result = $this->service->planPreventiva($data, (array) $this->currentUser);

            Response::success('Preventiva planejada com sucesso', $result, 201);

        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function updateStatus(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['id', 'status']);
            Validator::integer($data, 'id');
            Validator::max($data, 'obs', 1000);

            $result = $this->service->updateStatus(
                (int) $data['id'],
                trim($data['status']),
                trim($data['obs'] ?? ''),
                (array) $this->currentUser
            );

            Response::success('Status atualizado com sucesso', $result);

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

            $result = $this->service->delete((int) $data['id']);

            Response::success('Preventiva excluída com sucesso');

        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
