<?php

namespace App\Models\Administrators\Concerns;

use App\Enums\AuthEventEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\InactiveAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Exceptions\ServiceUnavailableException;
use App\Exceptions\TwoFactorRequiredException;
use App\Services\FeatureFlags\FeatureFlags;
use App\Services\Otp\OtpService;
use Illuminate\Support\Str;

/**
 * Two-factor (email OTP) login for administrators, with device-bound trust.
 */
trait TwoFactorAuthenticates
{
    /**
     * Verify credentials, then either issue a token (2FA off or trusted device)
     * or start the OTP flow (throws TwoFactorRequiredException).
     *
     * @param  array<string, mixed>  $credentials
     */
    public static function attemptTwoFactor(array $credentials, ?string $deviceToken = null): string
    {
        $admin = static::verifyCredentials($credentials);

        // During maintenance only developer admins may sign in — refused after
        // credential verification, before any OTP is issued or token minted.
        $admin->assertLoginAllowedDuringMaintenance();

        if (! static::twoFactorEnabled() || $admin->hasTrustedDevice($deviceToken)) {
            $admin->update(['last_login_at' => now()]);

            return $admin->authenticate();
        }

        $admin->startTwoFactor();
    }

    /**
     * Issue an OTP, store the pending-2FA handle, and halt with a 428.
     */
    protected function startTwoFactor(): never
    {
        $authToken = Str::random(64);
        $this->update([
            'auth_token' => hash('sha256', $authToken),
            'auth_token_expires_at' => now()->addSeconds((int) config('auth.administrators.two_factor.auth_token_ttl', 2100)),
        ]);

        $otp = app(OtpService::class)->generate('admin_2fa', $this->email, $this);
        OtpIssued::dispatch($otp);

        throw new TwoFactorRequiredException($authToken, $otp->resendToken, $otp->retryAfter);
    }

    /**
     * Complete 2FA: verify the PIN, issue a token, and trust the device.
     *
     * @return array{token: string, device_token: string}
     */
    public static function completeTwoFactor(string $authToken, string $pin): array
    {
        $admin = static::query()->where('auth_token', hash('sha256', $authToken))->first();

        if (! $admin) {
            throw new InvalidCredentialsException;
        }

        // The handshake handle is time-bounded: a stale token (from a proxy log,
        // browser history, or an abandoned login) must not stay redeemable (R3).
        if ($admin->auth_token_expires_at === null || $admin->auth_token_expires_at->isPast()) {
            throw new InvalidCredentialsException;
        }

        // Re-checked here, not just at the password step: an account switched off
        // while its handshake was in flight must not be able to finish it.
        if (! $admin->is_active) {
            throw new InactiveAccountException;
        }

        // Likewise re-checked: a non-developer whose handshake was in flight
        // when maintenance switched on must not be able to finish it.
        $admin->assertLoginAllowedDuringMaintenance();

        try {
            app(OtpService::class)->verify('admin_2fa', $admin->email, $pin);
        } catch (OtpLockedException $e) {
            static::recordAuthEvent(AuthEventEnum::OTP_LOCKED, $admin->email, $admin);

            throw $e;
        } catch (InvalidOtpException $e) {
            static::recordAuthEvent(AuthEventEnum::INVALID_OTP, $admin->email, $admin);

            throw $e;
        }

        $deviceToken = Str::random(64);

        $admin->update([
            'auth_token' => null,
            'auth_token_expires_at' => null,
            'auth_validated' => now(),
            'trusted_device' => hash('sha256', $deviceToken),
            'last_login_at' => now(),
        ]);

        return ['token' => $admin->authenticate(), 'device_token' => $deviceToken];
    }

    /**
     * Whether the given device token is trusted and within the trust window.
     */
    public function hasTrustedDevice(?string $deviceToken): bool
    {
        if (! $deviceToken || ! $this->trusted_device || ! $this->auth_validated) {
            return false;
        }

        $withinWindow = $this->auth_validated
            ->addSeconds((int) config('auth.administrators.two_factor.trust_window', 43200))
            ->isFuture();

        return $withinWindow && hash_equals($this->trusted_device, hash('sha256', $deviceToken));
    }

    /**
     * Whether admin 2FA is enabled.
     */
    /**
     * Clear the pending-2FA handshake and device trust. Called whenever
     * credentials change so a password reset/change fully re-arms 2FA — a stale
     * auth_token or trusted device must not survive a credential change.
     */
    public function resetTwoFactorState(): void
    {
        $this->update([
            'auth_token' => null,
            'auth_token_expires_at' => null,
            'auth_validated' => null,
            'trusted_device' => null,
        ]);
    }

    protected static function twoFactorEnabled(): bool
    {
        return (bool) config('auth.administrators.two_factor.enabled', true);
    }

    /**
     * Refuse the login while maintenance mode is on, unless the account is a
     * developer administrator (503 service_unavailable).
     */
    protected function assertLoginAllowedDuringMaintenance(): void
    {
        if (app(FeatureFlags::class)->enabled('maintenance_mode') && ! $this->is_developer) {
            throw new ServiceUnavailableException;
        }
    }
}
