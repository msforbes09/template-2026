<?php

namespace App\Services\Otp;

use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Exceptions\OtpThrottledException;
use App\Models\Misc\Otps\Otp;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Issues, verifies, and re-sends one-time PINs. Delivery-agnostic: the caller
 * decides how to deliver the plaintext PIN returned here.
 */
class OtpService
{
    /**
     * Issue a fresh OTP for the type + identifier, overwriting any prior row.
     */
    public function generate(string $type, string $identifier, ?Model $otpable = null): OtpResult
    {
        $existing = Otp::query()->where('type', $type)->where('identifier', $identifier)->first();

        if ($existing) {
            $this->assertNotLocked($existing);
            $this->assertNotThrottled($existing);
        }

        $pin = $this->newPin();
        $resendToken = Str::random(64);

        $otp = Otp::updateOrCreate(
            ['type' => $type, 'identifier' => $identifier],
            [
                'hashed_pin' => Hash::make($pin),
                'resend_token' => hash('sha256', $resendToken),
                'expires_at' => now()->addSeconds($this->config('ttl', 300)),
                'attempts' => 0,
                'resend_count' => 0,
                'locked_until' => null,
            ],
        );

        if ($otpable) {
            $otp->otpable()->associate($otpable)->save();
            // Hand back a fresh, lean model rather than the caller's instance (which may
            // carry request-bound relations such as the Sanctum token) — the result
            // travels inside a queued event and is serialized whole.
            $otp->unsetRelation('otpable');
        }

        return new OtpResult($pin, $resendToken, $type, $identifier, $otp->otpable, $this->config('resend_after', 60));
    }

    /**
     * Verify a PIN for the type + identifier. Consumes the OTP on success.
     *
     * On enumeration-prone flows (registration, password reset, contact change)
     * pass `revealAttempts: false`: the wrong-PIN failure then carries no
     * `remaining_attempts` meta, so it is byte-identical to the missing/expired-row
     * failure and cannot be used to test whether the account exists. Leave it true
     * for post-authentication flows (2FA login) where the identifier is already
     * known and the countdown is a legitimate UX signal.
     */
    public function verify(string $type, string $identifier, string $pin, bool $revealAttempts = true): OtpResult
    {
        $otp = Otp::query()->where('type', $type)->where('identifier', $identifier)->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw new InvalidOtpException;
        }

        $this->assertNotLocked($otp);

        if (! Hash::check($pin, $otp->hashed_pin)) {
            $otp->increment('attempts');

            if ($otp->attempts >= $this->config('max_attempts', 5)) {
                $otp->update(['locked_until' => now()->addSeconds($this->config('lockout_ttl', 900))]);

                throw new OtpLockedException($this->secondsUntil($otp->locked_until), $otp->locked_until);
            }

            throw new InvalidOtpException($revealAttempts ? $this->config('max_attempts', 5) - $otp->attempts : null);
        }

        $otpable = $otp->otpable;
        $otp->delete();

        return new OtpResult('', '', $type, $identifier, $otpable);
    }

    /**
     * Re-issue a PIN for an existing OTP handle, keeping its resend token.
     */
    public function resend(string $resendToken): OtpResult
    {
        $otp = Otp::query()->where('resend_token', hash('sha256', $resendToken))->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw new InvalidOtpException;
        }

        $this->assertNotLocked($otp);
        $this->assertNotThrottled($otp);

        if ($otp->resend_count + 1 > $this->config('max_resends', 5)) {
            $otp->update(['locked_until' => now()->addSeconds($this->config('lockout_ttl', 900))]);

            throw new OtpLockedException($this->secondsUntil($otp->locked_until), $otp->locked_until);
        }

        $pin = $this->newPin();

        // `attempts` is deliberately NOT reset. Zeroing it here handed an attacker a
        // fresh batch of guesses for the price of a resend, multiplying the guess
        // budget by `max_resends`. The count is cumulative across the OTP's whole life.
        $otp->update([
            'hashed_pin' => Hash::make($pin),
            'expires_at' => now()->addSeconds($this->config('ttl', 300)),
            'resend_count' => $otp->resend_count + 1,
        ]);

        return new OtpResult($pin, $resendToken, $otp->type, $otp->identifier, $otp->otpable, $this->config('resend_after', 60));
    }

    /**
     * Throw if the OTP is currently locked.
     */
    protected function assertNotLocked(Otp $otp): void
    {
        if ($otp->locked_until && $otp->locked_until->isFuture()) {
            throw new OtpLockedException($this->secondsUntil($otp->locked_until), $otp->locked_until);
        }
    }

    /**
     * Throw if the OTP was last sent within the resend cooldown.
     */
    protected function assertNotThrottled(Otp $otp): void
    {
        $nextAllowed = $otp->updated_at->addSeconds($this->config('resend_after', 60));

        if ($nextAllowed->isFuture()) {
            throw new OtpThrottledException($this->secondsUntil($nextAllowed));
        }
    }

    /**
     * Generate a zero-padded numeric PIN of the configured length.
     */
    protected function newPin(): string
    {
        $length = $this->config('length', 6);

        return str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    /**
     * Whole seconds from now until the given moment (never negative).
     */
    protected function secondsUntil(CarbonInterface $moment): int
    {
        return max(0, $moment->getTimestamp() - now()->getTimestamp());
    }

    /**
     * Read an integer OTP config value.
     */
    protected function config(string $key, int $default): int
    {
        return (int) config("otp.{$key}", $default);
    }
}
