<?php

namespace App\Api\Controllers;

use App\Api\Helpers\Request;
use App\Api\Helpers\Response;
use App\Api\Services\SolicitacaoCompraService;

class SolicitacaoCompraController
{
    private SolicitacaoCompraService $service;

    public function __construct(?SolicitacaoCompraService $service = null)
    {
        $this->service = $service ?? new SolicitacaoCompraService();
    }

    public function listAll(): void
    {
        try {
            $limit = (int) ($_GET['limit'] ?? 500);
            $offset = (int) ($_GET['offset'] ?? 0);
            $search = trim((string) ($_GET['search'] ?? ''));
            $status = trim((string) ($_GET['status'] ?? ''));
            $site = trim((string) ($_GET['site'] ?? ''));

            $result = $this->service->listAll(
                $limit > 0 ? $limit : 500,
                $offset > 0 ? $offset : 0,
                $search,
                $status !== '' ? $status : null,
                $site !== '' ? $site : null
            );

            Response::json([
                'success' => true,
                'message' => 'Solicitações listadas com sucesso',
                'data' => $result['items'],
                'total' => $result['total'],
                'status_counts' => $result['status_counts'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
            return;
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
            if ($item === null) {
                Response::json(['success' => false, 'message' => 'Solicitação não encontrada'], 404);
                return;
            }

            Response::json([
                'success' => true,
                'message' => 'Solicitação encontrada',
                'data' => $item,
            ]);
            return;
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function save(): void
    {
        try {
            $input = Request::body();
            if ($input === []) {
                Response::json(['success' => false, 'message' => 'Dados inválidos'], 400);
                return;
            }

            $id = $this->service->save($input);

            Response::json([
                'success' => true,
                'message' => 'Solicitação criada com sucesso',
                'data' => $this->service->getById($id),
                'id' => $id,
            ], 201);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function update(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($input['id'] ?? 0);

            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            unset($input['id']);

            $this->service->update($id, $input);

            Response::json([
                'success' => true,
                'message' => 'Solicitação atualizada com sucesso',
                'data' => $this->service->getById($id),
            ]);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function updateField(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($input['id'] ?? 0);
            $field = (string) ($input['field'] ?? '');

            if ($id <= 0 || $field === '' || !array_key_exists('value', $input)) {
                Response::json(['success' => false, 'message' => 'Dados inválidos'], 400);
                return;
            }

            $data = $this->service->updateField($id, $field, $input['value']);

            Response::json([
                'success' => true,
                'message' => 'Campo atualizado com sucesso',
                'data' => $data,
            ]);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
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

            $this->service->delete($id);

            Response::json([
                'success' => true,
                'message' => 'Solicitação excluída com sucesso',
            ]);
            return;
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
