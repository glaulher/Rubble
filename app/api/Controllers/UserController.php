<?php

namespace App\Api\Controllers;

use App\Api\Services\UserService;
use App\Api\Helpers\Response;
use App\Api\Helpers\Request;
use App\Api\Helpers\Validator;

class UserController
{
    private UserService $service;
    private object $currentUser;

    public function __construct(object $currentUser)
    {
        $this->service = new UserService();
        $this->currentUser = $currentUser;
    }

    public function listAll(): void
    {
        try {
            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);
            $search = trim($_GET['search'] ?? '');

            $data = $this->service->listAll($search, $limit, $offset);

            $data['items'] = array_map(function($user) {
                unset($user['password']);
                return $user;
            }, $data['items']);

            Response::json([
                'success' => true,
                'message' => 'Usuários listados com sucesso',
                'data' => $data['items'],
                'total' => $data['total'],
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Throwable $e) {
            Response::serverError($e);
        }
    }

    public function getById(): void
    {
        try {
            $id = Request::get('id');
            if (!$id) {
                Response::error('ID obrigatório', 400);
                return;
            }

            $data = $this->service->getById((int)$id);
            if (!$data) {
                Response::notFound('Usuário não encontrado');
                return;
            }

            unset($data['password']);
            Response::success('Usuário encontrado', $data);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    public function save(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['username', 'nome', 'password', 'role']);

            if (!filter_var($data['username'], FILTER_VALIDATE_EMAIL)) {
                Response::error('Informe um e-mail válido', 400);
            }

            $allowedRoles = ['admin', 'supervisor', 'coordenador', 'cliente'];
            if (!in_array($data['role'], $allowedRoles, true)) {
                Response::error('Role inválida', 400);
            }

            $id = $this->service->save($data);

            Response::success('Usuário cadastrado com sucesso', ['id' => $id], 201);
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    public function update(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['id', 'username', 'nome', 'password', 'role']);
            Validator::integer($data, 'id');

            if (!filter_var($data['username'], FILTER_VALIDATE_EMAIL)) {
                Response::error('Informe um e-mail válido', 400);
            }

            $allowedRoles = ['admin', 'supervisor', 'coordenador', 'cliente'];
            if (!in_array($data['role'], $allowedRoles, true)) {
                Response::error('Role inválida', 400);
            }

            $this->service->update((int)$data['id'], $data);

            Response::success('Usuário atualizado com sucesso');
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }

    public function delete(): void
    {
        try {
            $data = Request::body();

            Validator::required($data, ['id']);
            Validator::integer($data, 'id');

            $currentUserId = $this->currentUser->user_id ?? 0;

            $this->service->delete((int)$data['id'], $currentUserId);

            Response::success('Usuário excluído com sucesso');
        } catch (\Throwable $e) {
            Response::serverError($e, 400);
        }
    }
}
