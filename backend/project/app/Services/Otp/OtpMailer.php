<?php

namespace App\Services\Otp;

use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

/**
 * Delivers an OTP PIN by resolving the Mailable configured for its type.
 */
class OtpMailer
{
    /**
     * Queue the OTP email for the given result on the mailer queue.
     */
    public function send(OtpResult $result): void
    {
        /** @var class-string<Mailable>|null $mailable */
        $mailable = config("otp.mailables.{$result->type}");

        if (! $mailable) {
            throw new RuntimeException("No OTP mailable configured for type [{$result->type}].");
        }

        Mail::to($result->identifier)->send(new $mailable($result->pin));
    }
}
