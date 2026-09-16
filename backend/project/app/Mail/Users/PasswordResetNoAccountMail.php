<?php

namespace App\Mail\Users;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when a password reset is requested for an email with no password-based
 * account — instead of the reset code, so the response never discloses whether
 * an account exists. Resolved by OtpMailer for the
 * `user_password_reset_no_account` type, so its constructor accepts (and ignores)
 * the generated PIN like every OTP mailable.
 */
class PasswordResetNoAccountMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  string  $pin  The generated PIN — unused; accepted for OtpMailer parity.
     */
    public function __construct(string $pin) {}

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Password reset request');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(view: 'mail.users.password-reset-no-account');
    }
}
