<?php

namespace App\Api\Auth;

use App\Api\Helpers\Cache;

class JwtHelper
{
    public static function encode(array $payload, string $secret, int $ttl = 43200): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['jti'] = bin2hex(random_bytes(16));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttl;

        $segments = [];
        $segments[] = self::base64urlEncode(json_encode($header));
        $segments[] = self::base64urlEncode(json_encode($payload));

        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $secret, true);
        $segments[] = self::base64urlEncode($signature);

        return implode('.', $segments);
    }

    public static function decode(string $token, string $secret): ?object
    {
        if (empty($token)) {
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $header = json_decode(self::base64urlDecode($headerB64));
        if (!$header || ($header->alg ?? '') !== 'HS256') {
            return null;
        }

        $signingInput = "$headerB64.$payloadB64";
        $signature = self::base64urlDecode($signatureB64);

        if ($signature === false) {
            return null;
        }

        $expected = hash_hmac('sha256', $signingInput, $secret, true);
        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64urlDecode($payloadB64));
        if ($payload === null) {
            return null;
        }

        if (isset($payload->exp) && $payload->exp < time()) {
            return null;
        }

        if (isset($payload->jti) && Cache::has('revoked:' . $payload->jti)) {
            return null;
        }

        return $payload;
    }

    public static function base64urlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64urlDecode(string $data): string|false
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
