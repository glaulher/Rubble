<?php

namespace App\Api\Controllers;

use App\Api\Repositories\PvRepository;
use App\Api\Services\PvService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;

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

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
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

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
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

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
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

        } catch (\Throwable $e) {

            Response::serverError($e, 400);
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
    | CSV EXPORT
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

    public function exportCsv(): void
    {
        try {
            $search = trim($_GET['search'] ?? '');
            $status = isset($_GET['status']) && $_GET['status'] !== ''
                ? $_GET['status']
                : null;
            $cycle = isset($_GET['ciclo']) && $_GET['ciclo'] !== ''
                ? $_GET['ciclo']
                : null;

            $pvs = $this->service->listAll(999999, 0, $search, $status, $cycle, 'pv.id', 'ASC');

            $pvIds = array_map(fn($p) => $p['id'], $pvs['items']);
            $itemsGrouped = $this->service->getItemsForExport($pvIds);

            $data = [];
            foreach ($pvs['items'] as $pv) {
                $pvId = $pv['id'];
                $itens = $itemsGrouped[$pvId] ?? [];
                $data[] = [
                    'pv' => $pv,
                    'itens' => $itens,
                ];
            }

            Response::json([
                'success' => true,
                'message' => 'Dados exportados com sucesso',
                'data' => $data,
                'total' => count($data),
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL
    |--------------------------------------------------------------------------
    */

    public function uploadFile(): void
    {
        try {
            $type = $_POST['type'] ?? '';

            if (!in_array($type, ['os', 'laudo', 'orcamento'], true)) {
                Response::error('Tipo inválido. Use "os", "laudo" ou "orcamento"', 400);
                return;
            }

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $errorCode = $_FILES['file']['error'] ?? -1;
                $errorMsg = match ($errorCode) {
                    UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Arquivo excede o tamanho máximo',
                    UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
                    default => 'Erro no upload do arquivo',
                };
                error_log("[UPLOAD] Falha no upload: error_code={$errorCode}, type={$type}, _FILES=" . json_encode($_FILES['file'] ?? []));
                Response::error($errorMsg, 400);
                return;
            }

            $file = $_FILES['file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if ($ext !== 'pdf') {
                Response::error('Apenas arquivos PDF são permitidos', 400);
                return;
            }

            $maxSize = 10 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                Response::error('Arquivo excede o tamanho máximo de 10MB', 400);
                return;
            }

            $tmpPath = $file['tmp_name'];
            $handle = fopen($tmpPath, 'r');
            $firstBytes = fread($handle, 5);
            fclose($handle);
            if ($firstBytes !== '%PDF-') {
                Response::error('Arquivo não é um PDF válido', 400);
                return;
            }

            $dir = $type === 'os'
                ? PvRepository::OS_DIR
                : PvRepository::LAUDO_DIR;

            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
                error_log("[UPLOAD] Diretório criado: {$dir}");
            }

            if (!is_writable($dir)) {
                error_log("[UPLOAD] Diretório NÃO gravável: {$dir}, perms=" . substr(sprintf('%o', fileperms($dir)), -4));
                Response::error('Diretório de destino sem permissão de escrita', 500);
                return;
            }

            $osNumber = preg_replace('/[^0-9]/', '', $_POST['os_number'] ?? '');
            if (empty($osNumber)) {
                $osNumber = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file['name'], PATHINFO_FILENAME));
            }
            $filename = $osNumber . '.pdf';
            $destPath = $dir . '/' . $filename;

            $nameWithoutExt = $osNumber;

            $moveOk = move_uploaded_file($file['tmp_name'], $destPath);
            if (!$moveOk) {
                $errNo = error_get_last();
                error_log("[UPLOAD] move_uploaded_file FALHOU: tmp={$tmpPath}, dest={$destPath}, error=" . ($errNo['message'] ?? 'unknown'));
                Response::error('Falha ao salvar arquivo no servidor', 500);
                return;
            }

            error_log("[UPLOAD] Sucesso: {$destPath}, size={$file['size']}");
            Response::success('Arquivo enviado com sucesso', [
                'filename' => $nameWithoutExt,
            ]);

        } catch (\Throwable $e) {
            error_log("[UPLOAD] Exceção: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
            Response::serverError($e, 500);
        }
    }

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
