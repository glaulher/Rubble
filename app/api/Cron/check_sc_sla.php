<?php

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\ScSlaService;

Env::load(__DIR__ . '/../../../.env');

$service = new ScSlaService();
$result = $service->process();

if (PHP_SAPI === 'cli') {
    error_log('[check_sc_sla] ' . ($result['message'] ?? 'sem resultado'));
    exit(($result['sent'] ?? 0) > 0 ? 0 : 1);
}

return $result;
