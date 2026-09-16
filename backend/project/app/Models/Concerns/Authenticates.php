<?php

namespace App\Models\Concerns;

use App\Enums\AuthEventEnum;
use App\Exceptions\InactiveAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Services\Security\AuthAttemptRecorder;
use Illuminate\Support\Facades\Hash;

/**
 * Token authentication for a model.
 *
 * The using model must also use `Laravel\Sanctum\HasApiTokens`, define an
 * `AUTH_GUARD` constant (the guard name, e.g. `administrators`), and have
 * `email`, `password`, `is_active`, `last_login_at`, and
 * `with_temporary_password` columns.
 *
 * Every login and logout invalidates all of the model's existing tokens
 * (single active session).
 */
trait Authenticates
{
    /**
     * Verify credentials and return a fresh bearer token.
     *
     * @param  array<string, mixed>  $credentials
     */
    public static function attemptAuthentication(array $credentials): string
    {
        $model = static::verifyCredentials($credentials);

        $model->update(['last_login_at' => now()]);

        return $model->authenticate();
    }

    /**
     * Verify credentials and return the authenticatable model (issues no token).
     *
     * @param  array<string, mixed>  $credentials
     */
    protected static function verifyCredentials(array $credentials): static
    {
        $email = $credentials['email'] ?? null;

        $model = static::query()->where('email', $email)->first();

        if (! $model || ! Hash::check($credentials['password'] ?? '', $model->password)) {
            // Recorded even when nothing resolved, so credential spraying against
            // addresses that match no account is not invisible.
            static::recordAuthEvent(AuthEventEnum::INVALID_CREDENTIALS, $email, $model);

            throw new InvalidCredentialsException;
        }

        if (! $model->is_active) {
            static::recordAuthEvent(AuthEventEnum::ACCOUNT_INACTIVE, $email, $model);

            throw new InactiveAccountException;
        }

        return $model;
    }

    /**
     * Write one row to the authentication trail.
     */
    protected static function recordAuthEvent(AuthEventEnum $event, ?string $identifier, ?self $model = null): void
    {
        app(AuthAttemptRecorder::class)->record(static::authGuard(), $event, $identifier, $model);
    }

    /**
     * Invalidate existing tokens and issue a fresh bearer token.
     */
    public function authenticate(): string
    {
        $this->tokens()->delete();

        $minutes = (int) config('auth.'.static::authGuard().'.token_inactivity_minutes', 60);

        // The single point at which a bearer token is issued, so every successful
        // path — password, completed 2FA, trusted device — lands here.
        static::recordAuthEvent(AuthEventEnum::SUCCEEDED, $this->email, $this);

        return $this->createToken(static::authGuard(), $this->tokenAbilities(), now()->addMinutes($minutes))
            ->plainTextToken;
    }

    /**
     * The abilities granted to a freshly issued token (default: all).
     *
     * @return list<string>
     */
    protected function tokenAbilities(): array
    {
        return ['*'];
    }

    /**
     * The model authenticated on this model's guard, if any.
     */
    public static function authenticated(): ?static
    {
        return auth(static::authGuard())->user();
    }

    /**
     * Invalidate all of the model's tokens.
     */
    public function logout(): void
    {
        $this->tokens()->delete();

        static::recordAuthEvent(AuthEventEnum::LOGGED_OUT, $this->email, $this);
    }

    /**
     * Set a new password, clear the temporary-password flag, and RE-AUTHENTICATE:
     * a password change is the standard containment action for a suspected stolen
     * session, so it must revoke every existing token (done inside authenticate())
     * and hand the caller a fresh one — not leave the old token alive.
     */
    public function changePassword(string $password): string
    {
        // The forced change of a temporary password is exempt from the minimum age.
        if (! $this->with_temporary_password) {
            $this->assertPasswordOldEnoughToChange();
        }

        $this->update([
            'password' => $password,
            'with_temporary_password' => false,
        ]);

        $this->resetTwoFactorState();
        static::recordAuthEvent(AuthEventEnum::PASSWORD_CHANGED, $this->email, $this);

        return $this->authenticate();
    }

    /**
     * The guard name this model authenticates on.
     */
    protected static function authGuard(): string
    {
        return static::AUTH_GUARD;
    }
}
