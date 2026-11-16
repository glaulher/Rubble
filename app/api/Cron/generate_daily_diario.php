<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\DiarioService;

Env::load(__DIR__ . '/../../../.env');

date_default_timezone_set('America/Sao_Paulo');

$service = new DiarioService();
$result = $service->generateDailyEntriesForTechnicians();

if (PHP_SAPI === 'cli') {
    $msg = sprintf(
        '[generate_daily_diario] date=%s total_teams=%d created=%d skipped=%d',
        $result['date'] ?? date('Y-m-d'),
        $result['total_teams'] ?? 0,
        $result['created'] ?? 0,
        $result['skipped'] ?? 0
    );
    error_log($msg);
    echo $msg . PHP_EOL;
    exit(0);
}

return $result;
