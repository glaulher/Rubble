<?php

spl_autoload_register(function (string $class): void {
    $map = [
        'App\\Api\\Controllers\\' => __DIR__ . '/../app/api/Controllers/',
        'App\\Api\\Services\\' => __DIR__ . '/../app/api/Services/',
        'App\\Api\\Repositories\\' => __DIR__ . '/../app/api/Repositories/',
        'App\\Api\\Entities\\' => __DIR__ . '/../app/api/Entities/',
        'App\\Api\\Helpers\\' => __DIR__ . '/../app/api/Helpers/',
        'App\\Api\\Auth\\' => __DIR__ . '/../app/api/Auth/',
        'App\\Api\\Cron\\' => __DIR__ . '/../app/api/Cron/',
        'App\\Api\\Middleware\\' => __DIR__ . '/../app/api/Middleware/',
        'App\\Api\\' => __DIR__ . '/../app/api/',
        'App\\Config\\' => __DIR__ . '/',
        'PHPMailer\\PHPMailer\\' => __DIR__ . '/../app/libs/PHPMailer/src/',
    ];

    foreach ($map as $prefix => $dir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) === 0) {
            $relativeClass = substr($class, $len);
            $file = $dir . str_replace('\\', '/', $relativeClass) . '.php';
            if (file_exists($file)) {
                require $file;
                return;
            }
        }
    }
});
