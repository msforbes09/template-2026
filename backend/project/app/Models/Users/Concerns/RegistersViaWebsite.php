<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthChannelEnum;
use App\Enums\AuthEventEnum;
use App\Enums\UserStatusEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\InvalidOtpException;
use App\Notifications\Users\AccountRecoveredNotification;
use App\Notifications\Users\WelcomeNotification;
use App\Services\Otp\OtpResult;
use App\Services\Otp\OtpService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Website (non-SSO) self-registration for the User model: OTP-gated,
 * verify-before-create, landing in DRAFT status.
 */
trait RegistersViaWebsite
{
    /**
     * OTP type/context for website email verification (a new, unregistered email).
     */
    public const REGISTRATION_OTP_TYPE = 'user_registration';

    /**
     * OTP type for a registration attempt on an ALREADY-registered email. A
     * distinct type so the shared OtpMailer / common-otp-resend path delivers the
     * "account exists" notice instead of the PIN — for the first send and every
     * resend alike. The OTP is still generated (identical throttle/response), it
     * just cannot be completed.
     */
    public const REGISTRATION_EXISTS_OTP_TYPE = 'user_registration_exists';

    /**
     * OTP type for recovering a soft-deleted website account ("welcome back"):
     * verification RESTORES the trashed row — history, type, status, even a live
     * suspension — with the newly chosen password, instead of creating a fresh
     * account. Outwardly identical to a normal registration (anti-enumeration).
     */
    public const ACCOUNT_RECOVERY_OTP_TYPE = 'user_account_recovery';

    /**
     * Begin registration: issue an email OTP (keyed on the email) and, for a new
     * email, cache the pending payload and deliver the OTP via the shared
     * OtpIssued/SendOtp path. Nothing is written to `users` yet
     * (verify-before-create). Returns the OTP result; the caller exposes only its
     * `resend_token` + `retry_after`.
     *
     * Anti-enumeration: an OTP is *generated* the same way whether or not the
     * email is already registered, so the cooldown/lockout and the response are
     * identical. The branch is carried by the OTP *type*, which selects the mail
     * the shared OtpMailer delivers — the OTP for a new email, the "account
     * exists" notice for a registered one — for the first send and every resend
     * alike. A registered email cannot be completed (`verify` looks up the
     * new-email type only, and `completeRegistration` re-checks uniqueness).
     *
     * @param  array{channel?: string, email?: string, mobile_number?: string, first_name: string, last_name: string, company_name: string}  $data
     */
    public static function startRegistration(array $data): OtpResult
    {
        $channel = AuthChannelEnum::from($data['channel'] ?? AuthChannelEnum::EMAIL->value);
        $field = $channel->identifierField();
        $identifier = static::channelIdentifier($channel, $data);
        $exists = static::whereHashed($field, $identifier)->exists();
        $recoverable = ! $exists && static::trashedWebsiteAccount($field, $identifier, $channel) !== null;

        $result = app(OtpService::class)->generate(
            static::channelOtpType(match (true) {
                $exists => static::REGISTRATION_EXISTS_OTP_TYPE,
                $recoverable => static::ACCOUNT_RECOVERY_OTP_TYPE,
                default => static::REGISTRATION_OTP_TYPE,
            }, $channel),
            $identifier,
        );

        if (! $exists && ! $recoverable) {
            Cache::put(
                static::registrationCacheKey($identifier),
                [
                    'channel' => $channel->value,
                    $field => $identifier,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'company_name' => $data['company_name'],
                ],
                (int) config('otp.ttl', 300),
            );
        }

        OtpIssued::dispatch($result);
        static::recordAuthEvent(AuthEventEnum::REGISTRATION_STARTED, $identifier);

        return $result;
    }

    /**
     * Complete registration: verify the OTP, then (and only then) create the
     * DRAFT user from the cached payload with the chosen password, and return a
     * bearer token. Throws InvalidOtpException on a bad/expired PIN, a missing
     * cached payload, or an email that is already registered (indistinguishable,
     * by design).
     */
    public static function completeRegistration(string $identifier, string $otp, string $password, AuthChannelEnum $channel = AuthChannelEnum::EMAIL): string
    {
        $field = $channel->identifierField();
        $identifier = static::normalizeIdentifier($channel, $identifier);

        // Recovery branch: the identifier belongs to a soft-deleted website
        // account — verify the recovery-typed OTP and restore that row instead
        // of creating a fresh one.
        $trashed = static::trashedWebsiteAccount($field, $identifier, $channel);

        if ($trashed !== null) {
            app(OtpService::class)->verify(static::channelOtpType(static::ACCOUNT_RECOVERY_OTP_TYPE, $channel), $identifier, $otp, revealAttempts: false);

            return $trashed->recoverAccount($password, $channel);
        }

        app(OtpService::class)->verify(static::channelOtpType(static::REGISTRATION_OTP_TYPE, $channel), $identifier, $otp, revealAttempts: false);

        $payload = Cache::pull(static::registrationCacheKey($identifier));

        // Payload gone (expired) or the identifier is already registered.
        if (! $payload || static::whereHashed($field, $identifier)->exists()) {
            throw new InvalidOtpException;
        }

        $attributes = [
            $field => $identifier,
            'first_name' => $payload['first_name'],
            'last_name' => $payload['last_name'],
            'company_name' => $payload['company_name'],
            'password' => $password,
            'last_login_at' => now(),
            'status' => UserStatusEnum::DRAFT->value,
            'registration_method' => 'website',
            'authentication_method' => 'website',
            'authentication_channel' => $channel->value,
            'country_code' => 'PH', // address country: domestic PSGC addresses
        ];
        // The channel used to register is the one verified at creation.
        $attributes[$channel->verifiedAtColumn()] = now();

        $user = static::create($attributes);

        static::recordAuthEvent(AuthEventEnum::REGISTRATION_COMPLETED, $identifier, $user);
        // Registration IS the first login (last_login_at is stamped above and a
        // bearer token returned), so the login-path welcome can never fire for
        // this lane — greet the new user here instead.
        $user->notify(new WelcomeNotification);

        return $user->authenticate();
    }

    /**
     * The soft-deleted website account recoverable via this identifier + channel,
     * if any. Recovery is deliberately narrow: the row must have VERIFIED this
     * exact channel (so a recycled mobile can't recover an email-verified account
     * whose mobile was never confirmed), and only within the recovery window
     * (past it the identifier may have been reassigned, so it is treated as
     * available for a fresh account). Live rows take precedence.
     */
    protected static function trashedWebsiteAccount(string $field, string $identifier, AuthChannelEnum $channel): ?static
    {
        return static::onlyTrashed()
            ->whereHashed($field, $identifier)
            ->where('registration_method', 'website')
            ->whereNotNull($channel->verifiedAtColumn())
            ->where('deleted_at', '>=', now()->subDays((int) config('users.recovery_window_days', 30)))
            ->first();
    }

    /**
     * Restore this trashed account for its returning owner: un-delete the row,
     * set the newly chosen password and mark the verified channel — keeping the
     * status and history exactly as they were.
     * Returns a fresh bearer token.
     */
    public function recoverAccount(string $password, AuthChannelEnum $channel): string
    {
        $this->restore();

        $this->update([
            'password' => $password,
            'last_login_at' => now(),
            'authentication_channel' => $channel->value,
            $channel->verifiedAtColumn() => now(),
        ]);

        // Clear any stale 2FA handshake state carried over from before deletion,
        // so a token captured earlier cannot complete a login against the
        // recovered account (mirrors a password change/reset).
        $this->resetTwoFactorState();

        static::recordAuthEvent(AuthEventEnum::ACCOUNT_RECOVERED, $this->{$channel->identifierField()} ?? '', $this);
        $this->notify(new AccountRecoveredNotification($channel->value));

        return $this->authenticate();
    }

    /**
     * The cache key holding a pending registration payload for an email.
     */
    public static function registrationCacheKey(string $email): string
    {
        return 'registration:'.hash('sha256', static::normalizeEmail($email));
    }

    /**
     * Normalise a website email: trimmed + lowercased.
     */
    public static function normalizeEmail(?string $email): ?string
    {
        return $email === null ? null : Str::lower(trim($email));
    }
}
