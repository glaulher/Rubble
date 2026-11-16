<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Config\Database;
use PHPUnit\Framework\TestCase;

class DatabaseTimezoneTest extends TestCase
{
    public function testDatabaseSessionTimezoneIsAmericaSaoPauloOffset(): void
    {
        $db = Database::connect();
        $res = $db->query("SELECT @@session.time_zone AS session_tz, NOW() AS db_now");
        $this->assertNotFalse($res);
        $row = $res->fetch_assoc();
        $this->assertNotNull($row);

        $this->assertSame('-03:00', $row['session_tz']);

        date_default_timezone_set('America/Sao_Paulo');
        $phpNow = time();
        $dbNow = strtotime((string) $row['db_now']);

        // Database NOW() must match PHP America/Sao_Paulo within 5 seconds, NOT 3 hours ahead
        $this->assertLessThanOrEqual(5, abs($phpNow - $dbNow), "Database NOW() is not aligned with America/Sao_Paulo local time");
    }
}
