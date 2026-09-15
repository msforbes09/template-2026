<?php

namespace App\Services\Security;

use RuntimeException;

/**
 * Enforces key isolation for user PII in production. The PII cipher key falls
 * back to APP_KEY when PII_ENCRYPTION_KEY is unset (config/app.php) — convenient
 * for local dev, but in production it means one leaked APP_KEY (from a debug page,
 * a log, source control) exposes every user's PII. So production must set a
 * dedicated key explicitly; anything less fails closed at boot.
 */
class PiiKeyGuard
{
    /**
     * Throw when production is running without an explicit PII encryption key.
     */
    public static function assert(bool $isProduction, ?string $piiKey): void
    {
        if ($isProduction && ($piiKey === null || trim($piiKey) === '')) {
            throw new RuntimeException(
                'PII_ENCRYPTION_KEY must be set in production. Without it the PII cipher key '.
                'falls back to APP_KEY, so a single APP_KEY leak exposes all user PII. '.
                'Set PII_ENCRYPTION_KEY to the CURRENT APP_KEY value to keep existing ciphertext '.
                'readable, then rotate it with a backfill later.'
            );
        }
    }
}
