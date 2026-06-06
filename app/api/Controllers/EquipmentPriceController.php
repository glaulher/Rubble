<?php

namespace App\Api\Controllers;

use App\Api\Services\EquipmentPriceService;
use App\Api\Helpers\Response;

class EquipmentPriceController
{
    private EquipmentPriceService $service;

    public function __construct()
    {
        $this->service = new EquipmentPriceService();
    }

    public function listAll(): void
    {
        try {
            $items = $this->service->listAll();
            Response::success('', $items);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getById(): void
    {
        try {
            $id = (int) ($_GET['id'] ?? 0);

            if ($id <= 0) {
                Response::error('ID inválido', 400);
            }

            $item = $this->service->getById($id);

            if (!$item) {
                Response::error('Registro não encontrado', 404);
            }

            Response::success('', $item);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function save(): void
    {
        try {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];

            $id = $this->service->save($body);

            Response::success('Preço criado com sucesso', ['id' => $id]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function update(): void
    {
        try {
            $id = (int) ($_GET['id'] ?? 0);

            if ($id <= 0) {
                Response::error('ID inválido', 400);
            }

            $body = json_decode(file_get_contents('php://input'), true) ?? [];

            $updated = $this->service->update($id, $body);

            if (!$updated) {
                Response::error('Registro não encontrado', 404);
            }

            Response::success('Preço atualizado com sucesso');
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function delete(): void
    {
        try {
            $id = (int) ($_GET['id'] ?? 0);

            if ($id <= 0) {
                Response::error('ID inválido', 400);
            }

            $deleted = $this->service->delete($id);

            if (!$deleted) {
                Response::error('Registro não encontrado', 404);
            }

            Response::success('Preço excluído com sucesso');
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }
}
