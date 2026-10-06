<?php
/**
 * Simple JWT Helper Class
 * Implements HS256 algorithm without external dependencies.
 */
class JWTHelper {
    private static $secret;

    private static function init() {
        if (!self::$secret) {
            // Ensure env is loaded via db_connect or similar
            self::$secret = $_ENV['JWT_SECRET'] ?? 'default_secret_key_change_me';
        }
    }

    private static function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }

    public static function encode($payload) {
        self::init();
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
        
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode($token) {
        self::init();
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        $signature = self::base64UrlDecode($signatureEncoded);
        $expectedSignature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, self::$secret, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false; // Signature Verification Failed
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
        
        // Check Expiry
        if (isset($payload['exp']) && time() > $payload['exp']) {
            return false; // Token Expired
        }

        return $payload;
    }
}
