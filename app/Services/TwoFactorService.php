<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Minimal RFC 6238 TOTP implementation (SHA-1, 6 digits, 30s period).
 * Compatible with Google Authenticator / Authy / 1Password etc.
 */
class TwoFactorService
{
    protected const DIGITS = 6;
    protected const PERIOD = 30;

    /** Generate a new base32 secret key. */
    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    /** Build the otpauth:// URI for a user's authenticator app. */
    public function provisioningUri(string $secret, string $accountName): string
    {
        $label = 'ROICARD:' . $accountName;
        $params = http_build_query([
            'secret' => $secret,
            'issuer' => 'ROICARD',
            'algorithm' => 'SHA1',
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ]);

        return 'otpauth://totp/' . rawurlencode($label) . '?' . $params;
    }

    /** Verify a user-supplied code, allowing ±1 window for clock drift. */
    public function verify(string $secret, string $code): bool
    {
        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $counter = (int) floor(time() / self::PERIOD);

        for ($i = -1; $i <= 1; $i++) {
            if (hash_equals($this->generateCode($secret, $counter + $i), $code)) {
                return true;
            }
        }

        return false;
    }

    /** The current valid code for a given secret (for tests / previews). */
    public function currentCode(string $secret): string
    {
        return $this->generateCode($secret, (int) floor(time() / self::PERIOD));
    }

    /** RFC 6238 HOTP-derived code for a given 30s counter. */
    protected function generateCode(string $secret, int $counter): string
    {
        $key = $this->base32Decode($secret);
        $binary = pack('N*', 0) . pack('N*', $counter);
        $hash = hash_hmac('sha1', $binary, $key, true);
        $offset = ord($hash[strlen($hash) - 1]) & 0x0f;
        $value = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);

        return str_pad((string) ($value % 10 ** self::DIGITS), self::DIGITS, '0', STR_PAD_LEFT);
    }

    protected function base32Encode(string $data): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $binary = '';
        foreach (str_split($data) as $byte) {
            $binary .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';
        foreach (str_split($binary, 5) as $chunk) {
            $encoded .= $alphabet[bindec(str_pad($chunk, 5, '0'))];
        }

        return rtrim($encoded, 'A');
    }

    protected function base32Decode(string $data): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $data = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $data));
        $binary = '';
        foreach (str_split($data) as $char) {
            $binary .= str_pad(decbin(strpos($alphabet, $char)), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        foreach (str_split($binary, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $bytes .= chr(bindec($chunk));
            }
        }

        return $bytes;
    }
}
