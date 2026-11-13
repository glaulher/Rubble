<?php

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\SmEmailWatcherService;

Env::load(__DIR__ . '/../../../.env');

$service = new SmEmailWatcherService();
$result  = $service->process();

if (PHP_SAPI === 'cli') {
    $msg = 'SmEmailWatcher: checked=' . ($result['checked'] ?? 0)
         . ' updated=' . ($result['updated'] ?? 0)
         . ' errors=' . count($result['errors'] ?? []);
    error_log($msg);

    if (!empty($result['errors'])) {
        foreach ($result['errors'] as $err) {
            error_log('SmEmailWatcher error: ' . $err);
        }
    }

    exit(($result['updated'] ?? 0) > 0 ? 0 : 1);
}

return $result;
