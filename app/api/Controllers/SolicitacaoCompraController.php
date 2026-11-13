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

    /**
     * mysqli_sql_exception estende Exception, então sem este mapeamento o
     * catch de negócio devolveria 400 com o texto cru do MySQL (vazamento).
     */
    public static function dbErrorMessage(\mysqli_sql_exception $e): string
    {
        $sqlMessage = $e->getMessage();

        if (stripos($sqlMessage, 'Duplicate entry') !== false) {
            return 'Já existe uma solicitação com esse número de SC.';
        }

        if (
            stripos($sqlMessage, 'foreign key') !== false
            || stripos($sqlMessage, 'cannot be null') !== false
        ) {
            return 'Dados inválidos para esta solicitação.';
        }

        return 'Não foi possível salvar a solicitação.';
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
                $limit > 0 ? min($limit, 1000) : 500,
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
                'total_valor' => (float) ($result['total_valor'] ?? 0.0),
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
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
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
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
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
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
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
        } catch (\mysqli_sql_exception $e) {
            Response::error(self::dbErrorMessage($e), 400);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function sendEmail(): void
    {
        try {
            $input = Request::body();
            $id = (int) ($_POST['id'] ?? $input['id'] ?? 0);
            if ($id <= 0) {
                Response::json(['success' => false, 'message' => 'ID inválido'], 400);
                return;
            }

            $sc = $this->service->getById($id);
            if ($sc === null) {
                Response::json(['success' => false, 'message' => 'Solicitação não encontrada'], 404);
                return;
            }

            $uploadedPhotos = $this->extractUploadedFiles('fotos');

            $emailService = new \App\Api\Services\SmEmailService();
            $emailService->validatePhotos($uploadedPhotos);

            $result = $emailService->send($sc, $uploadedPhotos);

            if ($result['success']) {
                $this->service->updateField($id, 'status', 'solicitada_cotacao');
                $this->service->updateField($id, 'data_status', date('Y-m-d'));
            }

            Response::json($result, $result['success'] ? 200 : 500);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function sendBatchEmail(): void
    {
        try {
            $input = Request::body();
            $rawIds = $_POST['ids'] ?? $input['ids'] ?? [];
            if (!is_array($rawIds) || empty($rawIds)) {
                Response::json(['success' => false, 'message' => 'Nenhuma solicitação selecionada'], 400);
                return;
            }

            $ids = array_values(array_filter(array_map('intval', $rawIds), fn($id) => $id > 0));
            if (empty($ids)) {
                Response::json(['success' => false, 'message' => 'IDs inválidos'], 400);
                return;
            }

            $scs = [];
            foreach ($ids as $id) {
                $sc = $this->service->getById($id);
                if ($sc !== null) {
                    $scs[] = $sc;
                }
            }

            if (empty($scs)) {
                Response::json(['success' => false, 'message' => 'Nenhuma solicitação encontrada'], 404);
                return;
            }

            $uploadedPhotos = $this->extractUploadedFiles('fotos');

            $emailService = new \App\Api\Services\SmEmailService();
            $emailService->validatePhotos($uploadedPhotos);

            $result = $emailService->sendBatch($scs, $uploadedPhotos);

            if ($result['success']) {
                $today = date('Y-m-d');
                foreach ($ids as $id) {
                    $this->service->updateField($id, 'status', 'solicitada_cotacao');
                    $this->service->updateField($id, 'data_status', $today);
                }
            }

            Response::json($result, $result['success'] ? 200 : 500);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    private function extractUploadedFiles(string $fieldName): array
    {
        $files = $_FILES[$fieldName] ?? [];
        if (empty($files) || empty($files['name'])) {
            return [];
        }

        $result = [];
        if (is_array($files['name'])) {
            $count = count($files['name']);
            for ($i = 0; $i < $count; $i++) {
                if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                    continue;
                }
                $result[] = [
                    'name'     => $files['name'][$i],
                    'tmp_name' => $files['tmp_name'][$i],
                    'size'     => $files['size'][$i],
                    'type'     => $files['type'][$i],
                    'error'    => $files['error'][$i],
                ];
            }
        } else {
            if (($files['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                $result[] = [
                    'name'     => $files['name'],
                    'tmp_name' => $files['tmp_name'],
                    'size'     => $files['size'],
                    'type'     => $files['type'],
                    'error'    => $files['error'],
                ];
            }
        }
        return $result;
    }
}
