<?php

require_once __DIR__ . '/../../config/autoloader.php';

use App\Config\Env;
use App\Api\Middleware\{CorsMiddleware, AuthMiddleware, RateLimitMiddleware};
use App\Api\Router;
use App\Api\Helpers\Response;
use App\Api\Controllers\{AuthController, EquipmentController, EquipmentManagementController, EquipmentPriceController};
use App\Api\Controllers\{TicketController, DashboardController, PvDashboardController};
use App\Api\Controllers\{PvController, UserController, ScmController, PreventiveCycleController};

Env::load(__DIR__ . '/../../.env');

(new CorsMiddleware())->handle();

$route  = $_GET['route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

$auth = new AuthMiddleware();
$auth->handle($route, $method);

(new RateLimitMiddleware())->handle($route, $method);

$router = new Router();

// Equipment
$router->addRoute('equipment', 'GET', function () {
    if (isset($_GET['action']) && $_GET['action'] === 'check-chiller') {
        (new EquipmentController())->checkChiller();
    } elseif (isset($_GET['action']) && $_GET['action'] === 'tickets-by-equipment') {
        (new EquipmentController())->ticketsByEquipment();
    } elseif (isset($_GET['action']) && $_GET['action'] === 'sum-value') {
        (new EquipmentController())->sumValue();
    } elseif (isset($_GET['action']) && $_GET['action'] === 'tickets-by-ids') {
        (new EquipmentController())->ticketsByIds();
    } else {
        (new EquipmentController())->listAll();
    }
});

// Tickets
$router->addRoute('tickets', 'GET', function () {
    $controller = new TicketController();
    if (isset($_GET['id'])) {
        $controller->getById();
    } else {
        $controller->listByItem();
    }
});
$router->addRoute('tickets', 'POST', function () {
    $controller = new TicketController();
    if (isset($_GET['action']) && $_GET['action'] === 'import') {
        $controller->import();
    } else {
        $controller->save();
    }
});
$router->addRoute('tickets', 'PUT', fn () => (new TicketController())->update());
$router->addRoute('tickets', 'DELETE', fn () => (new TicketController())->delete());

// Dashboard
$router->addRoute('dashboard', 'GET', fn () => (new DashboardController())->stats());

// PV Dashboard
$router->addRoute('pv-dashboard', 'GET', fn () => (new PvDashboardController())->stats());

// Notifications
$router->addRoute('notify', 'GET', function () {
    try {
        $result = require __DIR__ . '/Cron/check_notification.php';
        Response::success($result['message'] ?? 'Notificação processada', [
            'sent' => $result['sent'] ?? 0,
        ]);
    } catch (\Throwable $e) {
        error_log("Erro na notificação: " . $e->getMessage());
        Response::error('Falha ao enviar e-mail de notificação', 500);
    }
});

// Locals (autocomplete)
$router->addRoute('locals', 'GET', fn () => (new PvController())->getLocals());

// PV
$router->addRoute('pv', 'GET', function () {
    $controller = new PvController();
    $action = $_GET['action'] ?? null;

    if ($action === 'lookup') {
        $controller->lookupItem();
    } elseif ($action === 'search-lpu') {
        $controller->searchLpuItems();
    } elseif ($action === 'search-os') {
        $controller->searchOs();
    } elseif ($action === 'export-csv') {
        $controller->exportCsv();
    } elseif ($action === 'list-by-ids') {
        $controller->listByIds();
    } elseif (isset($_GET['id'])) {
        $controller->getById();
    } else {
        $controller->listAll();
    }
});
$router->addRoute('pv', 'POST', function () {
    $controller = new PvController();
    $action = $_GET['action'] ?? null;

    if ($action === 'send-email') {
        $controller->sendEmail();
    } elseif ($action === 'send-batch-email') {
        $controller->sendBatchEmail();
    } elseif ($action === 'upload') {
        $controller->uploadFile();
    } else {
        $controller->save();
    }
});
$router->addRoute('pv', 'PUT', fn () => (new PvController())->update());
$router->addRoute('pv', 'PATCH', fn () => (new PvController())->updateStatus());
$router->addRoute('pv', 'DELETE', fn () => (new PvController())->delete());

// Auth
$router->addRoute('auth', 'POST', function () {
    $controller = new AuthController();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? '';

    if ($action === 'logout') {
        $controller->logout();
    } else {
        $controller->login();
    }
});
$router->addRoute('auth', 'GET', fn () => (new AuthController())->me());

// Config (public)
$router->addRoute('config', 'GET', function () {
    $siteKey = Env::get('TURNSTILE_SITE_KEY', '');
    if (Env::get('APP_DEBUG', 'false') === 'true') {
        $siteKey = '';
    }
    Response::success('', ['turnstile_site_key' => $siteKey]);
});

// Users
$router->addRoute('users', 'GET', function () use ($auth) {
    $ctrl = new UserController($auth->getUser());
    if (isset($_GET['id'])) {
        $ctrl->getById();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('users', 'POST', function () use ($auth) {
    (new UserController($auth->getUser()))->save();
});
$router->addRoute('users', 'PUT', function () use ($auth) {
    (new UserController($auth->getUser()))->update();
});
$router->addRoute('users', 'DELETE', function () use ($auth) {
    (new UserController($auth->getUser()))->delete();
});

// Equipment Management
$router->addRoute('equipment-management', 'GET', function () {
    $ctrl = new EquipmentManagementController();
    if (isset($_GET['id'])) {
        $ctrl->getById();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('equipment-management', 'POST', fn () => (new EquipmentManagementController())->save());
$router->addRoute('equipment-management', 'PUT', fn () => (new EquipmentManagementController())->update());
$router->addRoute('equipment-management', 'DELETE', fn () => (new EquipmentManagementController())->delete());

// Equipment Prices
$router->addRoute('equipment-prices', 'GET', function () {
    $ctrl = new EquipmentPriceController();
    if (isset($_GET['id'])) {
        $ctrl->getById();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('equipment-prices', 'POST', fn () => (new EquipmentPriceController())->save());
$router->addRoute('equipment-prices', 'PUT', fn () => (new EquipmentPriceController())->update());
$router->addRoute('equipment-prices', 'DELETE', fn () => (new EquipmentPriceController())->delete());

// Preventive Cycle
$router->addRoute('preventive-cycle', 'GET', function () {
    $ctrl = new PreventiveCycleController();
    $action = $_GET['action'] ?? null;

    if ($action === 'summary') {
        $ctrl->summary();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('preventive-cycle', 'POST', function () {
    $action = $_GET['action'] ?? null;
    $ctrl = new PreventiveCycleController();
    if ($action === 'check-all') {
        $ctrl->checkAll();
    } elseif ($action === 'uncheck-all') {
        $ctrl->uncheckAll();
    } else {
        $ctrl->save();
    }
});

// SCM
$router->addRoute('scm', 'GET', function () use ($auth) {
    $ctrl = new ScmController($auth->getUser());
    $action = $_GET['action'] ?? null;

    if ($action === 'getById') {
        $ctrl->getById();
    } elseif ($action === 'segments') {
        $ctrl->segments();
    } elseif ($action === 'sites') {
        $ctrl->sites();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('scm', 'POST', function () use ($auth) {
    (new ScmController($auth->getUser()))->import();
});
$router->addRoute('scm', 'DELETE', function () use ($auth) {
    (new ScmController($auth->getUser()))->delete();
});

// Dispatch
try {
    $router->dispatch($route, $method);
} catch (\Throwable $e) {
    http_response_code(500);
    $message = Env::get('APP_DEBUG', 'false') === 'true'
        ? $e->getMessage()
        : 'Erro interno do servidor';
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
}
