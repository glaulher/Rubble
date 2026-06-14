<?php

namespace App\Api\Controllers;

use App\Api\Services\PvService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;

class EmailController
{
    private PvService $service;

    public function __construct()
    {
        $this->service = new PvService();
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL
    |--------------------------------------------------------------------------
    */

    public function sendEmail(): void
    {
        try {

            $data = Request::body();

            Validator::required($data, ['id', 'subject']);
            Validator::integer($data, 'id');

            $pvData = $this->service->getById((int) $data['id']);
            if (!$pvData) {
                Response::error('PV não encontrada', 404);
                return;
            }

            $items = $pvData['itens'] ?? [];

            $service = new \App\Api\Services\PvEmailService();
            $result = $service->send(
                $pvData,
                $items,
                $data['subject'],
                $data['uf'] ?? null,
                $data['local'] ?? null
            );

            if ($result['success']) {
                Response::success($result['message']);
                return;
            }

            Response::error($result['message'], 400);

        } catch (\Throwable $e) {
            error_log('Erro ao enviar e-mail: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            Response::error('Erro ao enviar e-mail. Tente novamente mais tarde.', 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SEND BATCH EMAIL
    |--------------------------------------------------------------------------
    */

    public function sendBatchEmail(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['subject']);

            $ids = $data['ids'] ?? [];
            if (!is_array($ids) || empty($ids)) {
                Response::error('Selecione ao menos uma PV', 400);
                return;
            }

            $pvsData = $this->service->getByIds($ids);
            if (empty($pvsData)) {
                Response::error('Nenhuma PV encontrada', 404);
                return;
            }

            $allItems = [];
            foreach ($pvsData as $pv) {
                $pvItems = $pv['itens'] ?? [];
                foreach ($pvItems as $item) {
                    $item['numero_pv'] = $pv['numero_pv'] ?? '';
                    $allItems[] = $item;
                }
            }

            $service = new \App\Api\Services\PvEmailService();
            $result = $service->sendBatch(
                $pvsData,
                $allItems,
                $data['subject'],
                $data['uf'] ?? null,
                $data['local'] ?? null
            );

            if ($result['success']) {
                $targetStatus = 'E-mail de lib. aquisição/serviço';
                $this->service->updateItemsByWorstStatusBatch($ids, $targetStatus);
                Response::success($result['message']);
                return;
            }

            Response::error($result['message'], 400);

        } catch (\Throwable $e) {
            error_log('Erro ao enviar e-mail batch: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            Response::error('Erro ao enviar e-mail. Tente novamente mais tarde.', 400);
        }
    }
}
