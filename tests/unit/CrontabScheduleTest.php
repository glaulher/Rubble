<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CrontabScheduleTest extends TestCase
{
    public function testCrontabContainsTempoFechadoDailySyncAt8Am(): void
    {
        $crontabPath = __DIR__ . '/../../config/crontab';
        $this->assertFileExists($crontabPath);

        $content = file_get_contents($crontabPath);
        $this->assertMatchesRegularExpression(
            '/^0 8 \* \* \* php \/var\/www\/html\/app\/api\/Cron\/migrate_tempo_fechado_to_mariadb\.php/m',
            $content,
            'Crontab must contain daily 08:00 sync for migrate_tempo_fechado_to_mariadb.php'
        );
    }

    public function testDockerfileCronIncludesPythonAndOpenpyxl(): void
    {
        $dockerfilePath = __DIR__ . '/../../Dockerfile.cron';
        $this->assertFileExists($dockerfilePath);

        $content = file_get_contents($dockerfilePath);
        $this->assertStringContainsString('python3', $content);
        $this->assertStringContainsString('py3-openpyxl', $content);
    }
}
