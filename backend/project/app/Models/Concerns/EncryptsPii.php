<?php

namespace App\Models\Concerns;

use App\Exceptions\PiiDecryptException;
use App\Services\Security\PiiCrypter;
use Illuminate\Database\Eloquent\Builder;

/**
 * Transparently stores a model's PII in an encrypted `ciphertext` blob column,
 * with keyed-HMAC blind-index `{field}_hash` columns for the queryable subset.
 *
 * The using model defines:
 *   - const ENCRYPTED_PII = [...]  — fields kept only in the blob
 *   - const HASHED_PII    = [...]  — subset that also gets a `{field}_hash` column
 *
 * Access is transparent: `$model->first_name` reads from the decrypted blob and
 * setting it re-encrypts the blob (decrypt-once per instance, no cast-cache
 * reliance) and updates the hash. The raw attributes only ever hold ciphertext
 * and hashes, so serialization/audit never see plaintext.
 */
trait EncryptsPii
{
    /**
     * The decrypted PII for this instance (lazily loaded, reset on retrieve/save).
     *
     * @var array<string, mixed>|null
     */
    private ?array $decryptedPii = null;

    /**
     * Whether the stored blob failed to decrypt (wrong/rotated key, corruption).
     * Reads still degrade to null, but writes must fail closed while poisoned.
     */
    private bool $piiPoisoned = false;

    /**
     * Reset the decrypted cache (and poison flag) whenever the row is (re)loaded
     * or persisted.
     */
    protected static function bootEncryptsPii(): void
    {
        static::retrieved(function ($model) {
            $model->decryptedPii = null;
            $model->piiPoisoned = false;
        });
        static::saved(function ($model) {
            $model->decryptedPii = null;
            $model->piiPoisoned = false;
        });
    }

    /**
     * Read PII fields from the decrypted blob; everything else is normal.
     */
    public function getAttribute($key)
    {
        if (in_array($key, static::ENCRYPTED_PII, true)) {
            return $this->pii()[$key] ?? null;
        }

        return parent::getAttribute($key);
    }

    /**
     * Route PII writes into the blob (+ hash); everything else is normal.
     */
    public function setAttribute($key, $value)
    {
        if (in_array($key, static::ENCRYPTED_PII, true)) {
            $pii = $this->pii();

            // Never rebuild the blob from an empty base after a failed decrypt —
            // that would erase every other encrypted field irrecoverably (F3).
            if ($this->piiPoisoned) {
                throw new PiiDecryptException('Refusing to write PII over an undecryptable blob.');
            }

            $pii[$key] = $value;
            $this->decryptedPii = $pii;
            $this->attributes['ciphertext'] = app(PiiCrypter::class)->encrypt($pii);

            if (in_array($key, static::HASHED_PII, true)) {
                $this->attributes["{$key}_hash"] = app(PiiCrypter::class)->hash($value === null ? null : (string) $value);
            }

            return $this;
        }

        return parent::setAttribute($key, $value);
    }

    /**
     * Scope: exact-match on a blind-indexed PII field.
     */
    public function scopeWhereHashed(Builder $query, string $field, ?string $value): Builder
    {
        return $query->where("{$field}_hash", app(PiiCrypter::class)->hash($value));
    }

    /**
     * The lazily-decrypted PII blob for this instance.
     *
     * @return array<string, mixed>
     */
    private function pii(): array
    {
        if ($this->decryptedPii !== null) {
            return $this->decryptedPii;
        }

        try {
            return $this->decryptedPii = app(PiiCrypter::class)->decrypt($this->attributes['ciphertext'] ?? null, strict: true);
        } catch (PiiDecryptException) {
            // Read path stays resilient (null fields), but mark the instance so a
            // later write fails closed instead of overwriting the intact blob.
            $this->piiPoisoned = true;

            return $this->decryptedPii = [];
        }
    }
}
