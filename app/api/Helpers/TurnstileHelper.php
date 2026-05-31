<?php

namespace App\Api\Helpers;

class TurnstileHelper
{
    public static function verify(string $token, string $secret): bool
    {
        if (empty($secret) || empty($token)) {
            return false;
        }

        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'secret' => $secret,
                'response' => $token,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);

        $resp = json_decode(curl_exec($ch), true);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log('TurnstileHelper curl error: ' . $error);
            return false;
        }

        if ($httpCode !== 200) {
            error_log('TurnstileHelper HTTP error: ' . $httpCode);
            return false;
        }

        return ($resp['success'] ?? false) === true;
    }
}
