<?php

require_once __DIR__ . '/../../../config/autoloader.php';

use App\Config\Env;
use App\Api\Services\NotificationService;

Env::load(__DIR__ . '/../../../.env');

$service = new NotificationService();
return $service->process();
