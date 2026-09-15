<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthEventEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\InactiveAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Exceptions\TwoFactorRequiredException;
use App\Notifications\Users\WelcomeBackNotification;
use App\Notifications\Users\WelcomeNotification;
use App\Services\Otp\OtpService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Native email + password login with email-OTP two-factor authentication and
 * multi-device trust for the User model. Parallel to the administrator flow;
 * shares no code with it.
 */
trait TwoFactorAuthenticates
{
    /**
     * OTP type/context for user login 2FA.
     */
    public const TWO_FACTOR_OTP_TYPE = 'user_2fa';

    /**
     * Verify credentials, then either issue a token (2FA off or trusted device)
     * or start the OTP handshake (throws TwoFactorRequiredException, 428).
     *
     * @param  array<string, mixed>  $credentials
     */
    public static function attemptTwoFactor(array $credentials, ?string $deviceToken = null): string
    {
        $user = static::verifyPasswordCredentials($credentials);

        if (! static::twoFactorEnabled() || $user->hasTrustedDevice($deviceToken)) {
            $user->recordLogin();

            return $user->authenticate();
        }

        $user->startTwoFactor();
    }

    /**
     * Verify email + password against the blind index. Rejects unknown emails,
     * SSO-only (null-password) accounts, and wrong passwords identically.
     *
     * @param  array<string, mixed>  $credentials
     */
    protected static function verifyPasswordCredentials(array $credentials): static
    {
        $email = static::normalizeEmail($credentials['email'] ?? null);
        $user = static::whereHashed('email', $email)->first();

        if (! $user || $user->password === null || ! Hash::check($credentials['password'] ?? '', $user->password)) {
            static::recordAuthEvent(AuthEventEnum::INVALID_CREDENTIALS, $email, $user);

            throw new InvalidCredentialsException;
        }

        if (! $user->is_active) {
            static::recordAuthEvent(AuthEventEnum::ACCOUNT_INACTIVE, $email, $user);

            throw new InactiveAccountException;
        }

        return $user;
    }

    /**
     * Issue an OTP, store the expiring pending-2FA handle, and halt with a 428.
     */
    protected function startTwoFactor(): never
    {
        $authToken = Str::random(64);

        $this->update([
            'auth_token' => hash('sha256', $authToken),
            'auth_token_expires_at' => now()->addSeconds((int) config('auth.users.two_factor.auth_token_ttl', 2100)),
        ]);

        // The OTP belongs to this user (attributes its delivery log to them).
        $otp = app(OtpService::class)->generate(static::TWO_FACTOR_OTP_TYPE, $this->email, $this);
        OtpIssued::dispatch($otp);

        throw new TwoFactorRequiredException($authToken, $otp->resendToken, $otp->retryAfter);
    }

    /**
     * Complete 2FA: verify the PIN, trust the device, and issue a token.
     *
     * @return array{token: string, device_token: string}
     */
    public static function completeTwoFactor(string $authToken, string $pin): array
    {
        $user = static::query()->where('auth_token', hash('sha256', $authToken))->first();

        // Missing, or the handle expired (fail closed on a null expiry too).
        if (! $user || $user->auth_token_expires_at === null || $user->auth_token_expires_at->isPast()) {
            throw new InvalidCredentialsException;
        }

        // Re-checked here, not just at the password step: an account switched off
        // while its handshake was in flight must not be able to finish it.
        if (! $user->is_active) {
            throw new InactiveAccountException;
        }

        try {
            app(OtpService::class)->verify(static::TWO_FACTOR_OTP_TYPE, $user->email, $pin);
        } catch (OtpLockedException $e) {
            static::recordAuthEvent(AuthEventEnum::OTP_LOCKED, $user->email, $user);

            throw $e;
        } catch (InvalidOtpException $e) {
            static::recordAuthEvent(AuthEventEnum::INVALID_OTP, $user->email, $user);

            throw $e;
        }

        $deviceToken = Str::random(64);
        $user->addTrustedDevice($deviceToken);

        $user->update(['auth_token' => null, 'auth_token_expires_at' => null]);
        $user->recordLogin();

        return ['token' => $user->authenticate(), 'device_token' => $deviceToken];
    }

    /**
     * Whether the device token matches a trusted device still within its window.
     */
    public function hasTrustedDevice(?string $deviceToken): bool
    {
        if (! $deviceToken) {
            return false;
        }

        $hash = hash('sha256', $deviceToken);
        $window = (int) config('auth.users.two_factor.trust_window', 43200);

        foreach ($this->trusted_devices ?? [] as $entry) {
            if (hash_equals((string) ($entry['device'] ?? ''), $hash)
                && Carbon::parse($entry['trusted_at'])->addSeconds($window)->isFuture()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Trust a device: prune expired entries, append this one, keep the newest N.
     * The array mutation is dirtied here; the caller's update() persists it.
     */
    protected function addTrustedDevice(string $deviceToken): void
    {
        $window = (int) config('auth.users.two_factor.trust_window', 43200);
        $max = (int) config('auth.users.two_factor.max_trusted_devices', 5);

        $this->trusted_devices = collect($this->trusted_devices ?? [])
            ->filter(fn ($entry) => Carbon::parse($entry['trusted_at'])->addSeconds($window)->isFuture())
            ->push(['device' => hash('sha256', $deviceToken), 'trusted_at' => now()->format('Y-m-d H:i:s')])
            ->slice(-$max)
            ->values()
            ->all();
    }

    /**
     * Whether user 2FA is enabled.
     */
    /**
     * Clear the pending-2FA handshake and every trusted device. Called whenever
     * credentials change so a password reset/change fully re-arms 2FA — a stale
     * auth_token or trusted device must not survive a credential change.
     */
    public function resetTwoFactorState(): void
    {
        $this->update([
            'auth_token' => null,
            'auth_token_expires_at' => null,
            'trusted_devices' => null,
        ]);
    }

    /**
     * Stamp a successful login and greet the user in-app: `welcome` on the
     * very first login, `welcome.back` after an absence beyond
     * config('notifications.welcome_back_days'). Called only from the real
     * login paths — never from internal token re-issues (password change).
     */
    public function recordLogin(): void
    {
        $previous = $this->last_login_at;

        $this->update(['last_login_at' => now()]);

        if ($previous === null) {
            $this->notify(new WelcomeNotification);

            return;
        }

        $daysAway = (int) $previous->diffInDays(now());

        if ($daysAway > (int) config('notifications.welcome_back_days', 30)) {
            $this->notify(new WelcomeBackNotification($daysAway));
        }
    }

    protected static function twoFactorEnabled(): bool
    {
        return (bool) config('auth.users.two_factor.enabled', true);
    }
}
