<?php

namespace App\Api\Helpers;

use App\Config\Env;
use PHPMailer\PHPMailer\PHPMailer;

class MailerFactory
{
    public static function create(int $timeout = 15): PHPMailer
    {
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host = Env::get('SMTP_HOST');
        $mail->SMTPAuth = true;
        $mail->Username = Env::get('SMTP_USER');
        $mail->Password = Env::get('SMTP_PASS');
        $mail->SMTPSecure = 'tls';
        $mail->Port = (int) Env::get('SMTP_PORT', 587);
        $mail->Timeout = $timeout;
        $mail->setFrom(
            Env::get('SMTP_FROM_EMAIL'),
            Env::get('SMTP_FROM_NAME')
        );

        $hostname = self::resolveHostname();
        if ($hostname !== '') {
            $mail->Hostname = $hostname;
        }
        return $mail;
    }

    private static function resolveHostname(): string
    {
        $hostname = trim((string) Env::get('SMTP_HOSTNAME', ''));
        if ($hostname !== '') {
            return $hostname;
        }

        $fromEmail = (string) Env::get('SMTP_FROM_EMAIL', '');
        $atPos = strrpos($fromEmail, '@');
        if ($atPos === false) {
            return '';
        }

        $domain = strtolower(substr($fromEmail, $atPos + 1));
        return trim($domain);
    }
}
