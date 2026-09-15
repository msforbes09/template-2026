<?php

namespace App\Services\Otp;

use App\Jobs\SendSms;
use RuntimeException;

/**
 * Delivers an OTP by SMS, resolving the message template configured for its type
 * and queuing it through the bound SmsSender. The SMS counterpart of OtpMailer.
 * When the OTP belongs to a known user (`otpable`), the job carries that user so
 * the send is attributed to them.
 */
class OtpSmsSender
{
    /**
     * Queue the OTP text for the given result on the `sms` queue.
     */
    public function send(OtpResult $result): void
    {
        $template = config("otp.sms.{$result->type}");

        if (! $template) {
            throw new RuntimeException("No OTP SMS template configured for type [{$result->type}].");
        }

        $otpable = $result->otpable;

        SendSms::dispatch(
            $result->identifier,
            str_replace(':pin', $result->pin, $template),
            $otpable?->getMorphClass(),
            $otpable ? (int) $otpable->getKey() : null,
        );
    }
}
