<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthChannelEnum;
use App\Enums\AuthEventEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\PasswordUnchangedException;
use App\Notifications\Users\PasswordChangedNotification;
use App\Services\Otp\OtpResult;
use App\Services\Otp\OtpService;
use Illuminate\Support\Facades\Hash;

/**
 * Password management for users: authenticated change, and forgot/reset via an
 * emailed OTP (registration-style anti-enumeration). Both change and reset revoke
 * all sessions and issue a fresh token via authenticate().
 */
trait ManagesPassword
{
    /**
     * OTP type for a password reset on a resettable (password-holding) account.
     */
    public const PASSWORD_RESET_OTP_TYPE = 'user_password_reset';

    /**
     * OTP type for a reset attempt on an email with no resettable account.
     */
    public const PASSWORD_RESET_NO_ACCOUNT_OTP_TYPE = 'user_password_reset_no_account';

    /**
     * Change the authenticated user's password: set it, revoke all sessions, and
     * return a fresh token. "New != current" is enforced by the FormRequest.
     */
    public function updatePassword(string $newPassword): string
    {
        $this->update(['password' => $newPassword]);
        $this->resetTwoFactorState();
        static::recordAuthEvent(AuthEventEnum::PASSWORD_CHANGED, $this->email, $this);
        $this->notify(new PasswordChangedNotification);

        return $this->authenticate();
    }

    /**
     * Begin a password reset: issue an OTP whose type carries the branch (a reset
     * code for a resettable account, a "no account" notice otherwise), deliver it
     * via the shared OtpMailer, and log the attempt. The response is identical for
     * both branches (anti-enumeration).
     */
    public static function sendPasswordResetOtp(string $identifier, AuthChannelEnum $channel = AuthChannelEnum::EMAIL): OtpResult
    {
        $identifier = static::normalizeIdentifier($channel, $identifier);
        $account = static::resettableAccount($identifier, $channel);
        $purpose = $account !== null
            ? static::PASSWORD_RESET_OTP_TYPE
            : static::PASSWORD_RESET_NO_ACCOUNT_OTP_TYPE;

        // A reset OTP belongs to the account being reset (attributes its delivery log);
        // the "no account" notice has no owner. Same response either way (anti-enumeration).
        $result = app(OtpService::class)->generate(static::channelOtpType($purpose, $channel), $identifier, $account);
        OtpIssued::dispatch($result);
        static::recordAuthEvent(AuthEventEnum::PASSWORD_RESET_REQUESTED, $identifier);

        return $result;
    }

    /**
     * Complete a password reset: verify the reset OTP, reject an unchanged
     * password, set the new one, revoke all sessions, and return a fresh token.
     */
    public static function resetPasswordWithOtp(string $identifier, string $otp, string $newPassword, AuthChannelEnum $channel = AuthChannelEnum::EMAIL): string
    {
        $identifier = static::normalizeIdentifier($channel, $identifier);

        app(OtpService::class)->verify(static::channelOtpType(static::PASSWORD_RESET_OTP_TYPE, $channel), $identifier, $otp, revealAttempts: false);

        $user = static::query()->whereHashed($channel->identifierField(), $identifier)->whereNotNull('password')->first();

        if (! $user) {
            throw new InvalidOtpException;
        }

        if (Hash::check($newPassword, $user->password)) {
            throw new PasswordUnchangedException;
        }

        $user->update(['password' => $newPassword, 'authentication_channel' => $channel->value]);
        $user->resetTwoFactorState();
        static::recordAuthEvent(AuthEventEnum::PASSWORD_CHANGED, $identifier, $user);
        $user->notify(new PasswordChangedNotification);

        return $user->authenticate();
    }

    /**
     * Whether the identifier has a resettable (password-holding) account.
     */
    protected static function isResettable(string $identifier, AuthChannelEnum $channel = AuthChannelEnum::EMAIL): bool
    {
        return static::resettableAccount($identifier, $channel) !== null;
    }

    /**
     * The account a reset for this identifier would apply to — one that owns the
     * contact and has a password — or null (no such account / SSO-only).
     */
    protected static function resettableAccount(string $identifier, AuthChannelEnum $channel = AuthChannelEnum::EMAIL): ?static
    {
        return static::query()->whereHashed($channel->identifierField(), $identifier)->whereNotNull('password')->first();
    }
}
