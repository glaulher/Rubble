<?php

namespace Tests\Unit;

use App\Api\Helpers\MailerFactory;
use App\Config\Env;
use PHPUnit\Framework\TestCase;

class MailerFactoryTest extends TestCase
{
    private array $originalEnv = [];

    protected function setUp(): void
    {
        $this->originalEnv = $_ENV;
        (new \ReflectionClass(Env::class))->setStaticPropertyValue('loaded', []);
    }

    protected function tearDown(): void
    {
        foreach ($_ENV as $key => $value) {
            if (!array_key_exists($key, $this->originalEnv)) {
                unset($_ENV[$key]);
                putenv($key);
            }
        }
        (new \ReflectionClass(Env::class))->setStaticPropertyValue('loaded', []);
    }

    private function setEnv(string $key, string $value): void
    {
        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }

    public function testCreateUsesEnvHostname(): void
    {
        $this->setEnv('SMTP_FROM_EMAIL', 'glaulher.medeiros@engemon.com.br');
        $this->setEnv('SMTP_HOSTNAME', 'engemon.com.br');

        $mail = MailerFactory::create();

        $this->assertSame('engemon.com.br', $mail->Hostname);
    }

    public function testCreateFallsBackToFromEmailDomain(): void
    {
        $this->setEnv('SMTP_FROM_EMAIL', 'glaulher.medeiros@engemon.com.br');

        $mail = MailerFactory::create();

        $this->assertSame('engemon.com.br', $mail->Hostname);
    }

    public function testCreateLowercasesFallbackDomain(): void
    {
        $this->setEnv('SMTP_FROM_EMAIL', 'Glaulher.Medeiros@Engemon.COM.BR');

        $mail = MailerFactory::create();

        $this->assertSame('engemon.com.br', $mail->Hostname);
    }

    public function testCreateSetsFromAndSender(): void
    {
        $this->setEnv('SMTP_FROM_EMAIL', 'glaulher.medeiros@engemon.com.br');
        $this->setEnv('SMTP_FROM_NAME', 'Rubble');

        $mail = MailerFactory::create();

        $this->assertSame('glaulher.medeiros@engemon.com.br', $mail->From);
        $this->assertSame('Rubble', $mail->FromName);
        $this->assertSame('glaulher.medeiros@engemon.com.br', $mail->Sender);
    }
}
