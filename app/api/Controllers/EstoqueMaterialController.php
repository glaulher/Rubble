<?php

namespace App\Api\Controllers;

use App\Api\Helpers\Request;
use App\Api\Helpers\Response;
use App\Api\Services\EstoqueMaterialService;

class EstoqueMaterialController
{
    private EstoqueMaterialService $service;

    public function __construct(?EstoqueMaterialService $service = null)
    {
        $this->service = $service ?? new EstoqueMaterialService();
    }

    public static function dbErrorMessage(\mysqli_sql_exception $e): string
    {
        $sqlMessage = $e->getMessage();

        if (
            stripos($sqlMessage, 'foreign key') !== false
            || stripos($sqlMessage, 'cannot be null') !== false
        ) {
            return 'Dados inválidos ou registro relacionado não encontrado.';
        }

        return 'Não foi possível processar a operação no estoque.';
    }

    public function listAll(): void
    {
        try {
            $limit = (int) ($_GET['limit'] ?? 100);
            $offset = (int) ($_GET['offset'] ?? 0);
            $search = trim((string) ($_GET['search'] ?? ''));
            $status = trim((string) ($_GET['status'] ?? ''));
            $comPv = trim((string) ($_GET['com_pv'] ?? ''));
            $sortBy = trim((string) ($_GET['sort_by'] ?? 'id'));
            $sortDir = trim((string) ($_GET['sort_dir'] ?? 'DESC'));

            $result = $this->service->listAll(
                $limit > 0 ? min($limit, 1000) : 100,
                $offset >= 0 ? $offset : 0,
                $search,
                $status !== '' ? $status : null,
                $comPv !== '' ? $comPv : null,
                $sortBy,
                $sortDir
            );

            Response::json([
                'success' => true,
                'message' => 'Estoque listado com sucesso',
                'data' => $result['items'],
                'total' => $result['total'],
                'status_counts' => $result['status_counts'],
                'totals' => $result['totals'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getTotals(): void
    {
        try {
            $search = trim((string) ($_GET['search'] ?? ''));
            $status = trim((string) ($_GET['status'] ?? ''));
            $comPv = trim((string) ($_GET['com_pv'] ?? ''));

            $totals = $this->service->getTotals(
                $search,
                $status !== '' ? $status : null,
                $comPv !== '' ? $comPv : null
            );

            Response::json([
                'success' => true,
                'message' => 'Totais obtidos com sucesso',
                'data' => $totals,
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
            if ($item === null) {
                Response::json(['success' => false, 'message' => 'Item não encontrado'], 404);
                return;
            }

            Response::json([
                'success' => true,
                'message' => 'Item encontrado',
                'data' => $item,
            ]);
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
                'message' => 'Item registrado no estoque com sucesso',
                'data' => $this->service->getById($id),
                'id' => $id,
            ], 201);
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function update(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($input['id'] ?? ($_GET['id'] ?? 0));

            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            unset($input['id']);

            $this->service->update($id, $input);

            Response::json([
                'success' => true,
                'message' => 'Item atualizado com sucesso',
                'data' => $this->service->getById($id),
            ]);
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
        } catch (\InvalidArgumentException $e) {
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
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($input['id'] ?? ($_GET['id'] ?? 0));

            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            $this->service->delete($id);

            Response::json([
                'success' => true,
                'message' => 'Item excluído do estoque com sucesso',
            ]);
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getPvItems(): void
    {
        try {
            $numeroPv = trim((string) ($_GET['numero_pv'] ?? ''));
            if ($numeroPv === '') {
                Response::json(['success' => true, 'data' => []]);
                return;
            }

            $items = $this->service->getPvItems($numeroPv);

            Response::json([
                'success' => true,
                'message' => 'Itens da PV obtidos com sucesso',
                'data' => $items,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function exportCsv(): void
    {
        try {
            $search = trim((string) ($_GET['search'] ?? ''));
            $status = trim((string) ($_GET['status'] ?? ''));
            $comPv = trim((string) ($_GET['com_pv'] ?? ''));

            $csv = $this->service->exportCsv(
                $search,
                $status !== '' ? $status : null,
                $comPv !== '' ? $comPv : null
            );

            $filename = 'estoque_materiais_' . date('Ymd_His') . '.csv';

            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');

            echo $csv;
            exit;
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
