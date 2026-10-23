<?php

declare(strict_types=1);

namespace App\Api\Controllers;

use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Cache;
use App\Api\Services\DiarioService;

class DiarioController
{
    private DiarioService $service;
    private array $currentUser;

    public function __construct(array|object|null $user = null, ?DiarioService $service = null)
    {
        if (is_object($user)) {
            $this->currentUser = (array) $user;
        } elseif (is_array($user)) {
            $this->currentUser = $user;
        } else {
            $this->currentUser = [];
        }
        $this->service = $service ?? new DiarioService();
    }

    public function listAll(): void
    {
        try {
            $limit = isset($_GET['limit']) ? min(max((int) $_GET['limit'], 1), 500) : 20;
            $offset = isset($_GET['offset']) ? max((int) $_GET['offset'], 0) : 0;
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? [];
            $categoria = $_GET['categoria'] ?? [];
            $dataFrom = $_GET['data_from'] ?? '';
            $dataTo = $_GET['data_to'] ?? '';
            $sortBy = $_GET['sort'] ?? $_GET['sort_by'] ?? 'd.data';
            $sortDir = $_GET['dir'] ?? $_GET['sort_dir'] ?? 'DESC';

            $filters = [
                'search' => $search,
                'status' => $status,
                'categoria' => $categoria,
                'data_from' => $dataFrom,
                'data_to' => $dataTo,
            ];

            $cacheKey = 'diario_list:' . md5(json_encode([$filters, $limit, $offset, $sortBy, $sortDir]));
            if (Cache::has($cacheKey)) {
                $cached = Cache::get($cacheKey);
                Response::json(['success' => true, 'data' => $cached]);
                return;
            }

            $result = $this->service->listAll($filters, $limit, $offset, (string) $sortBy, (string) $sortDir);
            Cache::set($cacheKey, $result, 10);

            Response::json(['success' => true, 'data' => $result]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function lookupOs(): void
    {
        try {
            $os = trim((string) ($_GET['os'] ?? ''));
            $obs = $this->service->lookupOs($os);
            Response::json(['success' => true, 'data' => ['obs' => $obs]]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function create(): void
    {
        try {
            $data = Request::body();
            $result = $this->service->create($data, $this->currentUser);

            Cache::deleteByPrefix('diario_');

            Response::success('Registro criado com sucesso', $result);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
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
            if (!is_string($field) || trim($field) === '') {
                Response::error('Campo field obrigatório', 400);
                return;
            }

            $result = $this->service->updateField((int) $id, trim($field), $value);

            Cache::deleteByPrefix('diario_');

            Response::success('Campo atualizado com sucesso', $result);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function appendObs(): void
    {
        try {
            $data = Request::body();
            $id = $data['id'] ?? null;
            $texto = $data['texto'] ?? $data['obs'] ?? '';

            if ($id === null || !is_numeric($id)) {
                Response::error('Campo id obrigatório', 400);
                return;
            }

            $result = $this->service->appendObs((int) $id, (string) $texto, $this->currentUser);

            Cache::deleteByPrefix('diario_');

            Response::success('Observação adicionada com sucesso', $result);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function changeStatus(): void
    {
        try {
            $data = Request::body();
            $id = $data['id'] ?? null;
            $status = $data['status'] ?? '';

            if ($id === null || !is_numeric($id)) {
                Response::error('Campo id obrigatório', 400);
                return;
            }

            $result = $this->service->changeStatus((int) $id, (string) $status, $this->currentUser);

            Cache::deleteByPrefix('diario_');

            Response::success('Status alterado com sucesso', $result);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $data = Request::body();
            $id = $_GET['id'] ?? $data['id'] ?? null;

            if ($id === null || !is_numeric($id)) {
                Response::error('Campo id obrigatório', 400);
                return;
            }

            $this->service->delete((int) $id, $this->currentUser);

            Cache::deleteByPrefix('diario_');

            Response::success('Registro excluído com sucesso');
        } catch (\DomainException $e) {
            Response::error($e->getMessage(), 403);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
