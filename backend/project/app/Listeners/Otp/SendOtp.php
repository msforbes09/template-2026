<?php

namespace App\Listeners\Otp;

use App\Events\Otp\OtpIssued;
use App\Services\Otp\OtpMailer;
use App\Services\Otp\OtpSmsSender;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Delivers an issued OTP by its channel — SMS when the type has an `otp.sms`
 * template, email otherwise. Queued on the `mailer` queue.
 *
 * `ShouldBeEncrypted` is load-bearing, and for a sharper reason than elsewhere: the
 * PIN is a live second factor. It is stored *hashed* in `otps` precisely so it cannot
 * be read back — and then a queued listener serialised the plaintext into the `jobs`
 * table next door, handing anyone with read access to that database a working 2FA
 * code. Encrypting the payload closes that without giving up the queue.
 */
class SendOtp implements ShouldBeEncrypted, ShouldQueue
{
    /**
     * The queue this listener is pushed onto.
     */
    public string $queue = 'mailer';

    /**
     * Handle the event.
     */
    public function handle(OtpIssued $event): void
    {
        if (config("otp.sms.{$event->result->type}")) {
            app(OtpSmsSender::class)->send($event->result);

            return;
        }

        app(OtpMailer::class)->send($event->result);
    }
}
