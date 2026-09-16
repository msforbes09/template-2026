<?php

namespace App\Services\Security;

use App\Enums\AuthEventEnum;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Writes the authentication trail.
 *
 * The masking decision lives here and nowhere else, so a call site cannot forget
 * it: the identifier is stored MASKED for every guard (`j•••@example.com`,
 * `+6391•••••567` — recognisable, not harvestable) and hashed with the same keyed
 * HMAC that backs `users.email_hash`, keeping the plaintext out of the log while
 * still allowing attempts to be counted per address and joined back to an account.
 *
 * Written synchronously and deliberately not queued: a queued job would serialise the
 * identifier into the `jobs` table, putting the very value we are protecting into a
 * second place in plaintext.
 */
class AuthAttemptRecorder
{
    /**
     * Record one authentication event. Never allowed to break a login — a failure to
     * write the trail is logged and swallowed.
     */
    public function record(string $guard, AuthEventEnum $event, ?string $identifier, ?Model $account = null): void
    {
        try {
            AuthAttempt::create([
                'guard' => $guard,
                'event' => $event->value,
                'identifier' => PiiMasker::maskIdentifier($identifier),
                'identifier_hash' => app(PiiCrypter::class)->hash($identifier),
                // Encrypted-JSON blob (like users.ciphertext — extendable) for the
                // gated, audited investigation reveal; never stored readable.
                'ciphertext' => $identifier !== null && $identifier !== ''
                    ? app(PiiCrypter::class)->encrypt(['identifier' => $identifier])
                    : null,
                'user_type' => $account?->getMorphClass(),
                'user_id' => $account?->getKey(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'attempted_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Auth attempt not recorded: '.$e->getMessage(), ['guard' => $guard, 'event' => $event->value]);
        }
    }
}
