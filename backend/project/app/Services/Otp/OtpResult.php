<?php

namespace App\Services\Otp;

use Illuminate\Database\Eloquent\Model;

/**
 * The outcome of issuing, re-issuing, or verifying an OTP.
 */
class OtpResult
{
    /**
     * @param  string  $pin  The plaintext PIN (empty string on verify).
     * @param  string  $resendToken  The plaintext resend handle (empty string on verify).
     * @param  string  $type  The OTP type/context.
     * @param  string  $identifier  The delivery address.
     * @param  Model|null  $otpable  The owning model, if any.
     * @param  int  $retryAfter  Seconds until another send is allowed (resend cooldown).
     */
    public function __construct(
        public readonly string $pin,
        public readonly string $resendToken,
        public readonly string $type,
        public readonly string $identifier,
        public readonly ?Model $otpable,
        public readonly int $retryAfter = 0,
    ) {}
}
