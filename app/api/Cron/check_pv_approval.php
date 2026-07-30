<?php

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\PvEmailWatcherService;

Env::load(__DIR__ . '/../../../.env');

$service = new PvEmailWatcherService();
$result = $service->process();

if (PHP_SAPI === 'cli') {
    $msg = 'PvEmailWatcher: checked=' . ($result['checked'] ?? 0)
        . ' approved=' . ($result['approved'] ?? 0)
        . ' errors=' . count($result['errors'] ?? []);
    error_log($msg);

    if (!empty($result['errors'])) {
        foreach ($result['errors'] as $err) {
            error_log('PvEmailWatcher error: ' . $err);
        }
    }

    exit(($result['approved'] ?? 0) > 0 ? 0 : 1);
}

return $result;
