<?php

namespace App\Services\Security;

use App\Exceptions\PiiDecryptException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Log;

/**
 * Encrypts/decrypts a PII JSON blob (AES-256-CBC, authenticated) and derives
 * keyed-HMAC blind indexes for exact-match lookups. Keyed by config('app.pii_key').
 */
class PiiCrypter
{
    /**
     * The 32-byte binary key (shared by AES + HMAC).
     */
    private readonly string $key;

    /**
     * The AES encrypter.
     */
    private readonly Encrypter $encrypter;

    public function __construct()
    {
        $this->key = $this->normalizeKey((string) config('app.pii_key'));
        $this->encrypter = new Encrypter($this->key, 'AES-256-CBC');
    }

    /**
     * Encrypt a PII array into a ciphertext string.
     *
     * @param  array<string, mixed>  $data
     */
    public function encrypt(array $data): string
    {
        return $this->encrypter->encryptString((string) json_encode($data));
    }

    /**
     * Decrypt a ciphertext string back into a PII array (empty when unset).
     *
     * On a decrypt failure (wrong/rotated key, corrupt ciphertext) the default is
     * resilient — log and return [] so a read never crashes. Pass `strict: true`
     * to instead throw PiiDecryptException, which the write path uses to fail
     * closed rather than silently rebuild the blob from an empty base (F3).
     *
     * @return array<string, mixed>
     */
    public function decrypt(?string $ciphertext, bool $strict = false): array
    {
        if ($ciphertext === null || $ciphertext === '') {
            return [];
        }

        try {
            return json_decode($this->encrypter->decryptString($ciphertext), true) ?? [];
        } catch (DecryptException $e) {
            // Wrong/rotated key or corrupted ciphertext. Log so the mismatch is
            // visible either way.
            Log::warning('PII ciphertext could not be decrypted (MAC invalid / wrong key).', [
                'exception' => $e->getMessage(),
            ]);

            if ($strict) {
                throw new PiiDecryptException('PII ciphertext could not be decrypted.', 0, $e);
            }

            // Resilient read path: treat the PII as empty rather than crashing.
            return [];
        }
    }

    /**
     * A deterministic keyed-HMAC blind index of a value (lowercased + trimmed),
     * suitable for exact-match lookups. Null for null.
     */
    public function hash(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return hash_hmac('sha256', mb_strtolower(trim($value), 'UTF-8'), $this->key);
    }

    /**
     * Normalise any key form to 32 raw bytes for AES-256.
     */
    private function normalizeKey(string $key): string
    {
        if (str_starts_with($key, 'base64:')) {
            $decoded = (string) base64_decode(substr($key, 7), true);

            if (strlen($decoded) === 32) {
                return $decoded;
            }
        }

        return strlen($key) === 32 ? $key : hash('sha256', $key, true);
    }
}
