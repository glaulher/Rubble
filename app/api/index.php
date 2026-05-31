<?php

require_once __DIR__ . '/../../config/autoloader.php';

use App\Config\Env;
use App\Api\Controllers\AuthController;
use App\Api\Controllers\EquipmentController;
use App\Api\Controllers\EquipmentManagementController;
use App\Api\Controllers\TicketController;
use App\Api\Controllers\DashboardController;
use App\Api\Controllers\PvDashboardController;
use App\Api\Controllers\PvController;
use App\Api\Controllers\UserController;
use App\Api\Auth\AuthService;
use App\Api\Helpers\Response;

Env::load(__DIR__ . '/../../.env');

header('Content-Type: application/json; charset=utf-8');

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

$allowedOrigin = Env::get('ALLOWED_ORIGINS', '');

if (empty($allowedOrigin)) {
    Response::error('CORS not configured', 500);
}

header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$route  = $_GET['route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {

    /*
    |--------------------------------------------------------------------------
    | JWT MIDDLEWARE
    |--------------------------------------------------------------------------
    */

    $publicRoutes = ['auth', 'config'];

    if (!in_array($route, $publicRoutes, true)) {

        $authHeader = AuthService::getAuthHeader();

        if (empty($authHeader)) {
            Response::unauthorized('Token não fornecido');
        }

        $parts = explode(' ', $authHeader);

        if (count($parts) !== 2 || $parts[0] !== 'Bearer') {
            Response::unauthorized('Formato de token inválido');
        }

        $jwtSecret = Env::get('JWT_SECRET', '');

        if (empty($jwtSecret)) {
            Response::error('Erro interno: JWT_SECRET não configurado', 500);
        }

        $user = AuthService::validateToken($parts[1], $jwtSecret);

        if (!$user) {
            Response::unauthorized('Token inválido ou expirado');
        }

        $action = $_GET['action'] ?? null;

        if (!AuthService::requireRole($user, $route, $method, $action)) {
            Response::error('Permissão negada', 403);
        }
    }

    switch ($route) {

        /*
        |--------------------------------------------------------------------------
        | EQUIPMENTS
        |--------------------------------------------------------------------------
        */

        case 'equipment':

            if ($method !== 'GET') {
                Response::error('Método não permitido', 405);
            }

            if (isset($_GET['action']) && $_GET['action'] === 'check-chiller') {

                (new EquipmentController())->checkChiller();

            } else {

                (new EquipmentController())->listAll();
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | RECORDS
            |--------------------------------------------------------------------------
            */

        case 'tickets':

            $controller = new TicketController();

            switch ($method) {

                case 'GET':

                    if (isset($_GET['id'])) {

                        $controller->getById();

                    } else {

                        $controller->listByItem();
                    }

                    break;

                case 'POST':

                    if (isset($_GET['action']) && $_GET['action'] === 'import') {
                        $controller->import();
                    } else {
                        $controller->save();
                    }

                    break;

                case 'PUT':

                    $controller->update();

                    break;

                case 'DELETE':

                    $controller->delete();

                    break;

                default:
                    Response::error('Método não permitido', 405);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | DASHBOARD
            |--------------------------------------------------------------------------
            */

        case 'dashboard':

            if ($method !== 'GET') {
                Response::error('Método não permitido', 405);
            }

            (new DashboardController())->stats();

            break;

            /*
            |--------------------------------------------------------------------------
            | PV DASHBOARD
            |--------------------------------------------------------------------------
            */

        case 'pv-dashboard':

            if ($method !== 'GET') {
                Response::error('Método não permitido', 405);
            }

            (new PvDashboardController())->stats();

            break;

            /*
            |--------------------------------------------------------------------------
            | NOTIFICATIONS
            |--------------------------------------------------------------------------
            */

        case 'notify':

            try {
                $result = require_once __DIR__ . '/Cron/check_notification.php';

                echo json_encode([
                    'success' => true,
                    'sent' => $result['sent'] ?? 0,
                    'message' => $result['message'] ?? 'Notificação processada'
                ]);
            } catch (\Throwable $e) {
                error_log("Erro na notificação: " . $e->getMessage());

                echo json_encode([
                    'success' => false,
                    'message' => 'Falha ao enviar e-mail de notificação'
                ]);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | LOCALS (AUTOCOMPLETE)
            |--------------------------------------------------------------------------
            */

        case 'locals':

            if ($method !== 'GET') {
                Response::error('Método não permitido', 405);
            }

            (new PvController())->getLocals();

            break;

            /*
            |--------------------------------------------------------------------------
            | PV (PROPOSTA DE VENDA)
            |--------------------------------------------------------------------------
            */

        case 'pv':

            $controller = new PvController();

            switch ($method) {

                case 'GET':

                    if (isset($_GET['action']) && $_GET['action'] === 'lookup') {

                        $controller->lookupItem();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'search-lpu') {

                        $controller->searchLpuItems();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'search-os') {

                        $controller->searchOs();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'export-csv') {

                        $controller->exportCsv();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'list-by-ids') {

                        $controller->listByIds();

                    } elseif (isset($_GET['id'])) {

                        $controller->getById();

                    } else {

                        $controller->listAll();
                    }

                    break;

                case 'POST':

                    if (isset($_GET['action']) && $_GET['action'] === 'send-email') {

                        $controller->sendEmail();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'send-batch-email') {

                        $controller->sendBatchEmail();

                    } elseif (isset($_GET['action']) && $_GET['action'] === 'upload') {

                        $controller->uploadFile();

                    } else {

                        $controller->save();
                    }

                    break;

                case 'PUT':

                    $controller->update();

                    break;

                case 'PATCH':

                    $controller->updateStatus();

                    break;

                case 'DELETE':

                    $controller->delete();

                    break;

                default:

                    Response::error('Método não permitido', 405);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | AUTH (LOGIN / LOGOUT / ME)
            |--------------------------------------------------------------------------
            */

        case 'auth':

            $controller = new AuthController();

            switch ($method) {

                case 'POST':

                    $body = json_decode(file_get_contents('php://input'), true) ?? [];
                    $action = $body['action'] ?? '';

                    if ($action === 'logout') {
                        $controller->logout();
                    } else {
                        $controller->login();
                    }

                    break;

                case 'GET':

                    $controller->me();

                    break;

                default:

                    Response::error('Método não permitido', 405);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | CONFIG (public — Turnstile site key, etc.)
            |--------------------------------------------------------------------------
            */

        case 'config':

            if ($method !== 'GET') {
                Response::error('Método não permitido', 405);
            }

            $siteKey = Env::get('TURNSTILE_SITE_KEY', '');
            Response::success('', ['turnstile_site_key' => $siteKey]);

            break;

            /*
            |--------------------------------------------------------------------------
            | USERS
            |--------------------------------------------------------------------------
            */

        case 'users':

            $ctrl = new UserController($user);

            switch ($method) {

                case 'GET':

                    if (isset($_GET['id'])) {
                        $ctrl->getById();
                    } else {
                        $ctrl->listAll();
                    }

                    break;

                case 'POST':

                    $ctrl->save();

                    break;

                case 'PUT':

                    $ctrl->update();

                    break;

                case 'DELETE':

                    $ctrl->delete();

                    break;

                default:

                    Response::error('Método não permitido', 405);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | EQUIPMENT MANAGEMENT
            |--------------------------------------------------------------------------
            */

        case 'equipment-management':

            $ctrl = new EquipmentManagementController();

            switch ($method) {

                case 'GET':

                    if (isset($_GET['id'])) {
                        $ctrl->getById();
                    } else {
                        $ctrl->listAll();
                    }

                    break;

                case 'POST':

                    $ctrl->save();

                    break;

                case 'PUT':

                    $ctrl->update();

                    break;

                case 'DELETE':

                    $ctrl->delete();

                    break;

                default:

                    Response::error('Método não permitido', 405);
            }

            break;

            /*
            |--------------------------------------------------------------------------
            | ROUTE NOT FOUND
            |--------------------------------------------------------------------------
            */

        default:

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Rota não encontrada'
            ]);

            break;
    }

} catch (\Throwable $e) {

    http_response_code(500);

    $message = Env::get('APP_DEBUG', false)
        ? $e->getMessage()
        : 'Erro interno do servidor';

    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
}
