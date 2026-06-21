<?php

namespace App\Api\Controllers;

use App\Api\Services\PvService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;
use Exception;

class PvController
{
    private const ALLOWED_SORT = ['pv.id', 'pv.numero_pv', 'pv.data', 'pv.local', 'worst_status', 'itens_count', 'valor_total'];

    private PvService $service;

    public function __construct()
    {
        $this->service = new PvService();
    }

    /*
    |--------------------------------------------------------------------------
    | LIST
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

            $status =
                isset($_GET['status']) && $_GET['status'] !== ''
                    ? $_GET['status']
                    : null;

            $cycle =
                isset($_GET['ciclo']) && $_GET['ciclo'] !== ''
                    ? $_GET['ciclo']
                    : null;

            $sortBy =
                trim($_GET['sort_by'] ?? '') ?: 'pv.id';
            $sortBy = in_array($sortBy, self::ALLOWED_SORT) ? $sortBy : 'pv.id';

            $sortDir =
                trim($_GET['sort_dir'] ?? '') ?: 'DESC';
            $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

            $data =
                $this->service->listAll(
                    $limit,
                    $offset,
                    $search,
                    $status,
                    $cycle,
                    $sortBy,
                    $sortDir
                );

            Response::json([
                'success' => true,
                'message' => 'PVs listadas com sucesso',
                'data' => $data['items'],
                'total' => $data['total'],
                'total_valor' => $data['total_valor'],
                'limit' => $limit,
                'offset' => $offset,
                '_hash' => md5(serialize($data['items'])),
            ]);

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

            if (!$data) {

                Response::notFound(
                    'PV não encontrada'
                );
                return;
            }

            Response::success(
                'PV encontrada',
                $data
            );

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
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
                'local',
                'equipamento_id',
            ]);

            Validator::integer($data, 'equipamento_id');

            if (!empty($data['ciclo']) && !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $data['ciclo'])) {
                Response::error('Formato de ciclo inválido. Use AAAA-MM (ex: 2026-06)', 400);
                return;
            }

            if (empty($data['itens']) || !is_array($data['itens'])) {
                Response::error(
                    'Adicione pelo menos um item à PV',
                    400
                );
                return;
            }

            if (empty($data['os']) || trim($data['os']) === '') {
                Response::error('Informe pelo menos uma OS', 400);
                return;
            }

            $osList = array_map('trim', explode(',', $data['os']));
            foreach ($osList as $os) {
                if ($os !== '' && !preg_match('/^\d{4,7}$/', $os)) {
                    Response::error("A OS '$os' tem formato inválido. Use apenas números (4 a 7 dígitos)", 400);
                    return;
                }
            }

            $id =
                $this->service->save(
                    $data
                );

            Response::success(
                'PV salva com sucesso',
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
                'local',
                'equipamento_id',
            ]);

            Validator::integer($data, 'id');
            Validator::integer($data, 'equipamento_id');

            if (!empty($data['ciclo']) && !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $data['ciclo'])) {
                Response::error('Formato de ciclo inválido. Use AAAA-MM (ex: 2026-06)', 400);
                return;
            }

            if (empty($data['os']) || trim($data['os']) === '') {
                Response::error('Informe pelo menos uma OS', 400);
                return;
            }

            $osList = array_map('trim', explode(',', $data['os']));
            foreach ($osList as $os) {
                if ($os !== '' && !preg_match('/^\d{4,7}$/', $os)) {
                    Response::error("A OS '$os' tem formato inválido. Use apenas números (4 a 7 dígitos)", 400);
                    return;
                }
            }

            $this->service->update(
                $data
            );

            Response::success(
                'PV atualizada com sucesso'
            );

        } catch (\Exception $e) {

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE STATUS
    |--------------------------------------------------------------------------
    */

    public function updateStatus(): void
    {
        try {

            $data =
                Request::body();

            Validator::required($data, [
                'pv_id',
                'status',
            ]);

            Validator::integer(
                $data,
                'pv_id'
            );

            $this->service->updateItemsByWorstStatus(
                (int) $data['pv_id'],
                $data['status']
            );

            Response::success(
                'Status atualizado com sucesso'
            );

        } catch (\Exception $e) {

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LIST LOCALS
    |--------------------------------------------------------------------------
    */

    public function getLocals(): void
    {
        try {

            $data =
                $this->service->listLocations();

            Response::success(
                'Locais listados com sucesso',
                $data
            );

        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SOFT DELETE
    |--------------------------------------------------------------------------
    */

    public function delete(): void
    {
        try {

            $data =
                Request::body();

            Validator::required($data, [
                'id',
            ]);

            Validator::integer(
                $data,
                'id'
            );

            $this->service->delete(
                (int) $data['id']
            );

            Response::success(
                'PV excluída com sucesso'
            );

        } catch (\Exception $e) {

            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {

            Response::serverError($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LOOKUP LPU ITEM
    |--------------------------------------------------------------------------
    */

    public function lookupItem(): void
    {
        try {

            $lpuOrigin =
                $_GET['lpu_origem'] ?? '';

            $itemNumber =
                (int) ($_GET['numero_item'] ?? 0);

            if (empty($lpuOrigin) || $itemNumber <= 0) {

                Response::error(
                    'lpu_origem e numero_item são obrigatórios',
                    400
                );
                return;
            }

            $result =
                $this->service->lookupLpuItem(
                    $lpuOrigin,
                    $itemNumber
                );

            if (!$result) {

                Response::notFound(
                    'Item não encontrado na tabela informada'
                );
                return;
            }

            Response::success(
                'Item encontrado',
                $result
            );

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH LPU ITEMS (AUTOCOMPLETE)
    |--------------------------------------------------------------------------
    */

    public function searchLpuItems(): void
    {
        try {
            $lpuOrigin = $_GET['lpu_origem'] ?? '';
            $query = trim($_GET['q'] ?? '');

            if (empty($lpuOrigin)) {
                Response::error('lpu_origem é obrigatório', 400);
                return;
            }

            if (strlen($query) < 2) {
                Response::success('Resultados', []);
                return;
            }

            $result = $this->service->searchLpuItems($lpuOrigin, $query);

            Response::success('Resultados', $result);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH OS
    |--------------------------------------------------------------------------
    */

    public function searchOs(): void
    {
        try {
            $query = trim($_GET['q'] ?? '');

            $result = $this->service->searchTicketsByOs($query);

            Response::success('Resultados', $result);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LIST BY IDS
    |--------------------------------------------------------------------------
    */

    public function listByIds(): void
    {
        try {
            $idsParam = $_GET['ids'] ?? '';
            if (empty($idsParam)) {
                Response::error('Parâmetro ids é obrigatório', 400);
                return;
            }

            $ids = array_map('intval', explode(',', $idsParam));
            $ids = array_filter($ids, fn($id) => $id > 0);

            if (empty($ids)) {
                Response::error('IDs inválidos', 400);
                return;
            }

            $pvsData = $this->service->getListByIds($ids);
            if (empty($pvsData)) {
                Response::error('Nenhuma PV encontrada', 404);
                return;
            }

            $result = array_map(fn($pv) => [
                'id' => (int) $pv['id'],
                'numero_pv' => $pv['numero_pv'] ?? '',
                'local' => $pv['local'] ?? '',
                'uf' => $pv['uf'] ?? '',
                'localidade' => $pv['localidade'] ?? '',
                'local_do_endereco' => $pv['local_do_endereco'] ?? '',
                'os' => $pv['os'] ?? '',
            ], $pvsData);

            Response::success('PVs encontradas', ['pvs' => $result]);

        } catch (\Throwable $e) {
            error_log('Erro ao listar PVs por IDs: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            Response::error('Erro ao carregar PVs', 400);
        }
    }
}
