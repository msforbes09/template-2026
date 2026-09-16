<?php

namespace App\Models\Users\Concerns;

use App\Enums\AuthEventEnum;
use App\Events\Otp\OtpIssued;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\PasswordUnchangedException;
use App\Notifications\Users\PasswordChangedNotification;
use App\Rules\NotRecentlyUsedPassword;
use App\Services\Otp\OtpResult;
use App\Services\Otp\OtpService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
        $this->assertPasswordOldEnoughToChange();

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
    public static function sendPasswordResetOtp(string $email): OtpResult
    {
        $email = static::normalizeEmail($email);
        $account = static::resettableAccount($email);
        $purpose = $account !== null
            ? static::PASSWORD_RESET_OTP_TYPE
            : static::PASSWORD_RESET_NO_ACCOUNT_OTP_TYPE;

        // A reset OTP belongs to the account being reset (attributes its delivery log);
        // the "no account" notice has no owner. Same response either way (anti-enumeration).
        $result = app(OtpService::class)->generate($purpose, $email, $account);
        OtpIssued::dispatch($result);
        static::recordAuthEvent(AuthEventEnum::PASSWORD_RESET_REQUESTED, $email);

        return $result;
    }

    /**
     * Complete a password reset: verify the reset OTP, reject an unchanged
     * password, set the new one, revoke all sessions, and return a fresh token.
     */
    public static function resetPasswordWithOtp(string $email, string $otp, string $newPassword): string
    {
        $email = static::normalizeEmail($email);

        app(OtpService::class)->verify(static::PASSWORD_RESET_OTP_TYPE, $email, $otp, revealAttempts: false);

        $user = static::resettableAccount($email);

        if (! $user) {
            throw new InvalidOtpException;
        }

        // Only now, with the OTP proven: the history check must never run pre-auth.
        if ($user->hasRecentlyUsedPassword($newPassword)) {
            throw ValidationException::withMessages(['new_password' => [NotRecentlyUsedPassword::MESSAGE]]);
        }

        if (Hash::check($newPassword, $user->password)) {
            throw new PasswordUnchangedException;
        }

        $user->update(['password' => $newPassword]);
        $user->resetTwoFactorState();
        static::recordAuthEvent(AuthEventEnum::PASSWORD_CHANGED, $email, $user);
        $user->notify(new PasswordChangedNotification);

        return $user->authenticate();
    }

    /**
     * The account a reset for this email would apply to — one that owns the
     * address and has a password — or null (no such account / SSO-only).
     */
    protected static function resettableAccount(string $email): ?static
    {
        return static::query()->whereHashed('email', $email)->whereNotNull('password')->first();
    }
}
