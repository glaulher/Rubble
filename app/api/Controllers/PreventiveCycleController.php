<?php

namespace App\Api\Controllers;

use App\Api\Services\PreventiveCycleService;
use App\Api\Helpers\{Response, Request, Validator};

class PreventiveCycleController
{
    private PreventiveCycleService $service;

    public function __construct()
    {
        $this->service = new PreventiveCycleService();
    }

    public function listAll(): void
    {
        try {
            $ciclo = trim($_GET['ciclo'] ?? date('Y-m'));
            $limit = (int) ($_GET['limit'] ?? 20);
            $offset = (int) ($_GET['offset'] ?? 0);
            $search = trim($_GET['search'] ?? '');
            $checkedOnly = ($_GET['checked'] ?? '') === '1';
            $hasObservacao = ($_GET['has_observacao'] ?? '') === '1';
            $noScm = ($_GET['no_scm'] ?? '') === '1';
            $scmLancados = ($_GET['scm_lancados'] ?? '') === '1';
            $scmStatuses = [];
            if (!empty($_GET['scm_statuses'])) {
                $scmStatuses = is_array($_GET['scm_statuses'])
                    ? $_GET['scm_statuses']
                    : array_filter(array_map('trim', explode(',', $_GET['scm_statuses'])));
            }

            $data = $this->service->listAll($ciclo, $limit, $offset, $search, $checkedOnly, $hasObservacao, $noScm, $scmLancados, $scmStatuses);

            Response::json([
                'success' => true,
                'data' => $data['items'],
                'total' => $data['total'],
                'limit' => $limit,
                'offset' => $offset,
                'ciclo' => $ciclo,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function summary(): void
    {
        try {
            $ciclo = trim($_GET['ciclo'] ?? date('Y-m'));
            $hasObservacao = ($_GET['has_observacao'] ?? '') === '1';
            $noScm = ($_GET['no_scm'] ?? '') === '1';
            $scmLancados = ($_GET['scm_lancados'] ?? '') === '1';
            $scmStatuses = [];
            if (!empty($_GET['scm_statuses'])) {
                $scmStatuses = is_array($_GET['scm_statuses'])
                    ? $_GET['scm_statuses']
                    : array_filter(array_map('trim', explode(',', $_GET['scm_statuses'])));
            }
            $data = $this->service->summary($ciclo, $hasObservacao, $noScm, $scmLancados, $scmStatuses);
            Response::success('', $data);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function save(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['ciclo']);
            if (!isset($data['items']) || !is_array($data['items'])) {
                Response::validation('items deve ser um array');
                return;
            }

            $result = $this->service->save($data['ciclo'], $data['items']);

            Response::success('Ciclo salvo com sucesso', [
                'saved' => $result['saved'],
                'deleted' => $result['deleted'],
            ]);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function listIds(): void
    {
        try {
            $ciclo = trim($_GET['ciclo'] ?? '');
            if ($ciclo === '') {
                Response::validation('ciclo é obrigatório');
                return;
            }

            $search = trim($_GET['search'] ?? '');
            $hasObservacao = ($_GET['has_observacao'] ?? '') === '1';
            $noScm = ($_GET['no_scm'] ?? '') === '1';
            $scmLancados = ($_GET['scm_lancados'] ?? '') === '1';
            $scmStatuses = [];
            if (!empty($_GET['scm_statuses'])) {
                $scmStatuses = is_array($_GET['scm_statuses'])
                    ? $_GET['scm_statuses']
                    : array_filter(array_map('trim', explode(',', $_GET['scm_statuses'])));
            }
            $ids = $this->service->listIds($ciclo, $search, $hasObservacao, $noScm, $scmLancados, $scmStatuses);
            Response::success('', ['ids' => $ids]);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function validateScm(): void
    {
        try {
            $scmNumber = trim($_GET['scm_number'] ?? '');
            if ($scmNumber === '') {
                Response::validation('scm_number é obrigatório');
                return;
            }
            $data = $this->service->validateScm($scmNumber);
            Response::success('', $data);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function scmStatusCount(): void
    {
        try {
            $ciclo = trim($_GET['ciclo'] ?? date('Y-m'));
            $data = $this->service->scmStatusCount($ciclo);
            Response::success('', $data);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
