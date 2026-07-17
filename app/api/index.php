<?php

require_once __DIR__ . '/../../config/autoloader.php';

use App\Config\Env;
use App\Api\Middleware\{CorsMiddleware, AuthMiddleware, RateLimitMiddleware};
use App\Api\Router;
use App\Api\Helpers\{Response, Request};
use App\Api\Controllers\{
    AuthController, EquipmentController, EquipmentManagementController, EquipmentPriceController,
    TicketController, DashboardController, PvDashboardController,
    PvController, UserController, ScmController, PreventiveCycleController,
    UploadController, EmailController, ExportController, PdfAuditController,
    PlannedActivityController, PreventivaController
};

Env::load(__DIR__ . '/../../.env');

date_default_timezone_set('America/Sao_Paulo');

(new CorsMiddleware())->handle();

$route  = $_GET['route'] ?? '';
$method = Request::method();

$auth = new AuthMiddleware();
$auth->handle($route, $method);

(new RateLimitMiddleware())->handle($route, $method);

$router = new Router();

// Equipment
$router->addRoute('equipment', 'GET', function () use ($auth) {
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
$router->addRoute('tickets', 'GET', function () use ($auth) {
    $controller = new TicketController();
    if (isset($_GET['id'])) {
        $controller->getById();
    } else {
        $controller->listByItem();
    }
});
$router->addRoute('tickets', 'POST', function () use ($auth) {
    $controller = new TicketController();
    if (isset($_GET['action']) && $_GET['action'] === 'import') {
        $controller->import();
    } elseif (isset($_GET['action']) && $_GET['action'] === 'import-infratel') {
        $controller->importInfratel();
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
$router->addRoute('notify', 'GET', function () use ($auth) {
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
$router->addRoute('pv', 'GET', function () use ($auth) {
    $controller = new PvController();
    $action = $_GET['action'] ?? null;

    if ($action === 'lookup') {
        $controller->lookupItem();
    } elseif ($action === 'search-lpu') {
        $controller->searchLpuItems();
    } elseif ($action === 'search-os') {
        $controller->searchOs();
    } elseif ($action === 'export-csv') {
        (new ExportController())->exportCsv();
    } elseif ($action === 'list-by-ids') {
        $controller->listByIds();
    } elseif (isset($_GET['id'])) {
        $controller->getById();
    } else {
        $controller->listAll();
    }
});
$router->addRoute('pv', 'POST', function () use ($auth) {
    $controller = new PvController();
    $action = $_GET['action'] ?? null;

    if ($action === 'send-email') {
        (new EmailController())->sendEmail();
    } elseif ($action === 'send-batch-email') {
        (new EmailController())->sendBatchEmail();
    } elseif ($action === 'upload') {
        (new UploadController())->uploadFile();
    } else {
        $controller->save();
    }
});
$router->addRoute('pv', 'PUT', fn () => (new PvController())->update());
$router->addRoute('pv', 'PATCH', fn () => (new PvController())->updateStatus());
$router->addRoute('pv', 'DELETE', function () {
    $controller = new PvController();
    $action = $_GET['action'] ?? null;
    if ($action === 'delete-item') {
        $controller->deleteItem();
    } else {
        $controller->delete();
    }
});

// Auth
$router->addRoute('auth', 'POST', function () use ($auth) {
    $controller = new AuthController();
    $body = Request::body();
    $action = $body['action'] ?? '';

    if ($action === 'logout') {
        $controller->logout();
    } else {
        $controller->login();
    }
});
$router->addRoute('auth', 'GET', function () {
    $ctrl = new AuthController();
    $action = $_GET['action'] ?? '';
    if ($action === 'active-count') {
        $ctrl->activeCount();
    } else {
        $ctrl->me();
    }
});

// Config (public)
$router->addRoute('config', 'GET', function () use ($auth) {
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
$router->addRoute('equipment-management', 'GET', function () use ($auth) {
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
$router->addRoute('equipment-prices', 'GET', function () use ($auth) {
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
$router->addRoute('preventive-cycle', 'GET', function () use ($auth) {
    $ctrl = new PreventiveCycleController();
    $action = $_GET['action'] ?? null;

    if ($action === 'summary') {
        $ctrl->summary();
    } elseif ($action === 'validate-scm') {
        $ctrl->validateScm();
    } elseif ($action === 'scm-status-count') {
        $ctrl->scmStatusCount();
    } elseif ($action === 'list-ids') {
        $ctrl->listIds();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('preventive-cycle', 'POST', function () use ($auth) {
    $ctrl = new PreventiveCycleController();
    $ctrl->save();
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
    } elseif ($action === 'cycles') {
        $ctrl->listCycles();
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

// Planned Activities
$router->addRoute('planned-activities', 'GET', function () use ($auth) {
    $ctrl = new PlannedActivityController();
    $action = $_GET['action'] ?? '';
    if ($action === 'export-csv') {
        $ctrl->exportCsv();
    } else {
        $ctrl->listAll();
    }
});
$router->addRoute('planned-activities', 'POST', function () use ($auth) {
    $ctrl = new PlannedActivityController($auth->getUser());
    $action = $_GET['action'] ?? '';
    if ($action === 'duplicate') {
        $ctrl->duplicate();
    } elseif ($action === 'reorder') {
        $ctrl->reorder();
    } elseif ($action === 'move-date') {
        $ctrl->moveDate();
    } elseif ($action === 'extend-sla') {
        $ctrl->extendSla();
    } elseif ($action === 'set-sla') {
        $ctrl->setSla();
    } else {
        $ctrl->plan();
    }
});
$router->addRoute('planned-activities', 'PUT', function () use ($auth) {
    $ctrl = new PlannedActivityController($auth->getUser());
    $action = $_GET['action'] ?? '';
    if ($action === 'update-obs') {
        $ctrl->updateObs();
    } elseif ($action === 'update-status') {
        $ctrl->updateCorretivaStatus();
    } else {
        $ctrl->updateTeam();
    }
});
$router->addRoute('planned-activities', 'DELETE', function () use ($auth) {
    (new PlannedActivityController($auth->getUser()))->delete();
});

// Preventiva
$router->addRoute('preventiva', 'POST', function () use ($auth) {
    $ctrl = new PreventivaController($auth->getUser());
    $action = $_GET['action'] ?? '';
    if ($action === 'update-status') {
        $ctrl->updateStatus();
    } else {
        $ctrl->plan();
    }
});
$router->addRoute('preventiva', 'DELETE', function () use ($auth) {
    (new PreventivaController($auth->getUser()))->delete();
});

// PDF Audit
$router->addRoute('pdf-audit', 'POST', function () use ($auth) {
    $ctrl = new PdfAuditController();
    $action = $_GET['action'] ?? '';

    if ($action === 'set-reference') {
        $ctrl->setReference();
    } elseif ($action === 'audit') {
        $ctrl->audit();
    } elseif ($action === 'clear-reference') {
        $ctrl->clearReference();
    } else {
        Response::error('Ação não encontrada', 404);
    }
});
$router->addRoute('pdf-audit', 'GET', function () use ($auth) {
    $ctrl = new PdfAuditController();
    $action = $_GET['action'] ?? '';

    if ($action === 'health') {
        $ctrl->health();
    } elseif ($action === 'get-reference') {
        $ctrl->getReference();
    } else {
        Response::error('Ação não encontrada', 404);
    }
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
