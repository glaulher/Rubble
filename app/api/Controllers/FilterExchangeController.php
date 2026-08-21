<?php

namespace App\Api\Controllers;

use App\Api\Helpers\Response;
use App\Api\Helpers\Cache;
use App\Api\Helpers\Request;
use App\Api\Services\FilterExchangeService;

class FilterExchangeController
{
    private FilterExchangeService $service;
    private ?object $currentUser;

    public function __construct(?FilterExchangeService $service = null, ?object $currentUser = null)
    {
        $this->service = $service ?? new FilterExchangeService();
        $this->currentUser = $currentUser;
    }

    public function listAll(): void
    {
        try {
            $limit = isset($_GET['limit']) ? min(max((int) $_GET['limit'], 1), 200) : 20;
            $offset = isset($_GET['offset']) ? max((int) $_GET['offset'], 0) : 0;
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';
            $sortBy = trim($_GET['sort_by'] ?? '') ?: 'f.local';
            $sortDir = trim($_GET['sort_dir'] ?? '') ?: 'ASC';

            if (!in_array($sortBy, FilterExchangeService::ALLOWED_SORT, true)) {
                $sortBy = 'f.local';
            }
            if (!in_array(strtoupper($sortDir), FilterExchangeService::ALLOWED_DIRS, true)) {
                $sortDir = 'ASC';
            }

            $cacheKey = 'filter_exchanges:' . md5(json_encode([$limit, $offset, $search, $status, $sortBy, $sortDir]));

            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json(['success' => true, 'data' => $cached]);
                return;
            }

            $result = $this->service->listAll($limit, $offset, $search, $status, $sortBy, $sortDir);

            Cache::set($cacheKey, $result, 10);

            Response::json(['success' => true, 'data' => $result]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function create(): void
    {
        try {
            $data = Request::body();

            $local = is_string($data['local'] ?? null) ? trim($data['local']) : '';
            $equipamento = is_string($data['equipamento'] ?? null) ? trim($data['equipamento']) : '';
            $uf = is_string($data['uf'] ?? null) ? trim($data['uf']) : '';
            $regiao = is_string($data['regiao'] ?? null) ? trim($data['regiao']) : '';
            $tamanho = is_string($data['tamanho'] ?? null) ? trim($data['tamanho']) : '';
            $qtd = isset($data['qtd']) ? (int) $data['qtd'] : 1;

            $this->service->create($local, $equipamento, $uf, $regiao, $tamanho, $qtd);

            Cache::deleteByPrefix('filter_exchanges:');

            Response::success('Filtro adicionado com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function updateField(): void
    {
        try {
            $data = Request::body();

            $id = $data['id'] ?? null;
            $field = $data['field'] ?? '';
            $value = $data['value'] ?? null;

            if ($id === null || !is_numeric($id)) {
                Response::error('Campo id obrigatório', 400);
                return;
            }
            if (!is_string($field) || $field === '') {
                Response::error('Campo field obrigatório', 400);
                return;
            }

            $this->service->updateField((int) $id, $field, $value, $this->currentUser);

            $data = [];
            if ($field === 'data_troca') {
                $data['data_proxima_troca'] = $this->service->computeNextDate($value === null ? null : (string) $value);
                $data['status'] = $this->service->computeStatus($data['data_proxima_troca']);
            }

            Cache::deleteByPrefix('filter_exchanges:');
            Cache::deleteByPrefix('equipment_list:');

            Response::success('Campo atualizado com sucesso', $data);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

            if ($id <= 0) {
                Response::error('Campo id obrigatório', 400);
                return;
            }

            $this->service->delete($id, $this->currentUser);

            Cache::deleteByPrefix('filter_exchanges:');

            Response::success('Filtro excluído com sucesso');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
