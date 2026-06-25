<?php

namespace App\Api\Controllers;

use App\Api\Services\ScmService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use Exception;

class ScmController
{
    private ScmService $service;
    private object $user;

    public function __construct(object $user)
    {
        $this->user = $user;
        $this->service = new ScmService();
    }

    public function listAll(): void
    {
        try {
            $limit = (int) ($_GET['limit'] ?? 20);
            $offset = (int) ($_GET['offset'] ?? 0);
            $search = trim($_GET['search'] ?? '');
            $dateFrom = trim($_GET['date_from'] ?? '');
            $dateTo = trim($_GET['date_to'] ?? '');
            $segmentoRaw = trim($_GET['segmento'] ?? '');
            $segments = $segmentoRaw !== '' ? array_filter(array_map('trim', explode(',', $segmentoRaw))) : [];
            $sitesRaw = trim($_GET['sites'] ?? '');
            $sites = $sitesRaw !== '' ? array_filter(array_map('trim', explode(',', $sitesRaw))) : [];
            $status = trim($_GET['status'] ?? '');
            $ciclo = trim($_GET['ciclo'] ?? '');

            $data = $this->service->listAll($limit, $offset, $search, $dateFrom ?: null, $dateTo ?: null, $segments, $status ?: null, $sites, $ciclo ?: null);

            Response::json([
                'success'     => true,
                'message'     => 'SCMs listados com sucesso',
                'data'        => $data['items'],
                'total'       => $data['total'],
                'total_valor' => $data['total_valor'],
                'limit'       => $limit,
                'offset'      => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function listCycles(): void
    {
        try {
            $cycles = $this->service->cycles();
            Response::json([
                'success' => true,
                'data'    => $cycles,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getById(): void
    {
        try {
            $id = (int) ($_GET['id'] ?? 0);
            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            $item = $this->service->getById($id);
            if (!$item) {
                Response::json(['success' => false, 'message' => 'SCM não encontrado'], 404);
                return;
            }

            Response::json(['success' => true, 'data' => $item]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function import(): void
    {
        try {
            $input = Request::body();
            if (!$input || !isset($input['rows']) || !is_array($input['rows'])) {
                Response::json(['success' => false, 'message' => 'Dados inválidos'], 400);
                return;
            }

            $result = $this->service->importBatch($input['rows']);

            Response::json([
                'success'   => true,
                'message'   => "Importação concluída: {$result['imported']} novos, {$result['updated']} atualizados, {$result['skipped']} ignorados",
                'imported'  => $result['imported'],
                'updated'   => $result['updated'],
                'skipped'   => $result['skipped'],
                'errors'    => $result['errors'],
            ]);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function segments(): void
    {
        try {
            $segments = $this->service->segments();
            Response::json(['success' => true, 'data' => $segments]);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function sites(): void
    {
        try {
            $sites = $this->service->sites();
            Response::json(['success' => true, 'data' => $sites]);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($input['id'] ?? 0);
            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            $deleted = $this->service->delete($id);
            if (!$deleted) {
                Response::json(['success' => false, 'message' => 'Erro ao excluir SCM'], 500);
                return;
            }

            Response::json(['success' => true, 'message' => 'SCM excluído com sucesso']);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
