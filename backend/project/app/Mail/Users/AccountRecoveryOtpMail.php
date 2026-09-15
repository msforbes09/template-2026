<?php

namespace App\Mail\Users;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The "welcome back" OTP: verifying it restores a returning user's previously
 * deleted account (with a new password) instead of creating a fresh one.
 */
class AccountRecoveryOtpMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  string  $pin  The one-time PIN.
     */
    public function __construct(public readonly string $pin) {}

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Welcome back — recover your account');
    }

    /**
     * Build the message content (view).
     */
    public function content(): Content
    {
        return new Content(view: 'mail.users.account-recovery-otp');
    }
}
