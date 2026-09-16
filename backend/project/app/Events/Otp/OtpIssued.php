<?php

namespace App\Events\Otp;

use App\Services\Otp\OtpResult;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired when an OTP is issued or re-issued, so a listener can deliver it.
 */
class OtpIssued
{
    use Dispatchable;

    /**
     * @param  OtpResult  $result  The issued OTP (carries the plaintext PIN + delivery target).
     */
    public function __construct(public readonly OtpResult $result) {}
}
