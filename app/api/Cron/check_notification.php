<?php

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\NotificationService;

Env::load(__DIR__ . '/../../../.env');

$service = new NotificationService();
$result = $service->process();

// CLI exit code for supercronic
if (PHP_SAPI === 'cli') {
    exit(($result['sent'] ?? 0) > 0 ? 0 : 1);
}

return $result;
