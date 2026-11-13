<?php

namespace Tests\Unit;

use App\Api\Services\SmEmailService;
use PHPUnit\Framework\TestCase;

class SmEmailServiceTest extends TestCase
{
    public function test_buildSubject_com_pv_vinculada(): void
    {
        $sc = [
            'numero_sm'         => '260001',
            'site'              => 'HUB NITEROI',
            'equipamento'       => 'Self 01',
            'equipamento_texto' => null,
            'numero_pv'         => '260091',
        ];
        $service = new SmEmailService();
        $subject = $service->buildSubject($sc);
        $this->assertStringContainsString('SM: 260001', $subject);
        $this->assertStringContainsString('HUB NITEROI', $subject);
        $this->assertStringContainsString('Solicitação de Materiais', $subject);
        $this->assertStringContainsString('PV 260091', $subject);
    }

    public function test_buildSubject_sem_pv_vinculada(): void
    {
        $sc = [
            'numero_sm'         => '260002',
            'site'              => 'HUB TIJUCA',
            'equipamento'       => null,
            'equipamento_texto' => 'Condensadora 36k',
            'numero_pv'         => null,
        ];
        $service = new SmEmailService();
        $subject = $service->buildSubject($sc);
        $this->assertStringContainsString('SM: 260002', $subject);
        $this->assertStringNotContainsString('PV', $subject);
    }

    public function test_buildBody_contem_cabecalho_e_observacao(): void
    {
        $sc = [
            'numero_sm'         => '260001',
            'site'              => 'HUB NITEROI',
            'equipamento'       => 'Self 01',
            'equipamento_texto' => null,
            'numero_pv'         => null,
            'data'              => '2026-11-13',
            'titulo_email'      => 'Filtros para Self 01',
            'observacao'        => "2x Filtro 20x20\n1x Filtro 25x30",
        ];
        $service = new SmEmailService();
        $body = $service->buildBody($sc);
        $this->assertStringContainsString('Prezados', $body);
        $this->assertStringContainsString('Solicitamos', $body);
        $this->assertStringContainsString('260001', $body);
        $this->assertStringContainsString('Filtros para Self 01', $body);
        $this->assertStringContainsString('Filtro 20x20', $body);
    }

    public function test_validatePhotos_aceita_ate_10_arquivos(): void
    {
        $service = new SmEmailService();
        $files = [];
        for ($i = 0; $i < 10; $i++) {
            $tmp = tempnam(sys_get_temp_dir(), 'sm_test_');
            file_put_contents($tmp, str_repeat('x', 100 * 1024)); // 100 KB
            $files[] = [
                'tmp_name' => $tmp,
                'size'     => 100 * 1024,
                'name'     => "foto{$i}.jpg",
                'type'     => 'image/jpeg',
                'error'    => UPLOAD_ERR_OK
            ];
        }

        $this->expectNotToPerformAssertions();
        $service->validatePhotos($files);
        foreach ($files as $f) {
            @unlink($f['tmp_name']);
        }
    }

    public function test_validatePhotos_rejeita_mais_de_10_arquivos(): void
    {
        $service = new SmEmailService();
        $files = [];
        for ($i = 0; $i < 11; $i++) {
            $files[] = [
                'tmp_name' => '/tmp/x',
                'size'     => 100,
                'name'     => "f{$i}.jpg",
                'type'     => 'image/jpeg',
                'error'    => UPLOAD_ERR_OK
            ];
        }
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/máximo.*10/i');
        $service->validatePhotos($files);
    }

    public function test_validatePhotos_rejeita_foto_maior_que_500kb(): void
    {
        $service = new SmEmailService();
        $files = [
            [
                'tmp_name' => '/tmp/x',
                'size'     => 512001,
                'name'     => 'grande.jpg',
                'type'     => 'image/jpeg',
                'error'    => UPLOAD_ERR_OK
            ],
        ];
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/500\s*KB/i');
        $service->validatePhotos($files);
    }

    public function test_validatePhotos_rejeita_tipo_invalido(): void
    {
        $service = new SmEmailService();
        $files = [
            [
                'tmp_name' => '/tmp/x',
                'size'     => 100,
                'name'     => 'doc.pdf',
                'type'     => 'application/pdf',
                'error'    => UPLOAD_ERR_OK
            ],
        ];
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/tipo.*inválido|formato.*aceito/i');
        $service->validatePhotos($files);
    }

    public function test_send_suporta_singular_e_plural_de_sm_emails(): void
    {
        $service = new SmEmailService();
        $ref = new \ReflectionClass($service);
        $method = $ref->getMethod('configureAndSend');
        $method->setAccessible(true);

        // Sem destinatários configurados
        $res = $method->invoke($service, 'Assunto', 'Corpo', [], []);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('SM_EMAILS', $res['message']);
    }
}
