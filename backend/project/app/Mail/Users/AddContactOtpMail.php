<?php

namespace App\Mail\Users;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Emails the OTP that verifies a new email a user is adding to their existing
 * account. Delivered by the queued, encrypted SendOtp listener via OtpMailer.
 */
class AddContactOtpMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  string  $pin  The plaintext verification PIN.
     */
    public function __construct(public readonly string $pin) {}

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your email address');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(view: 'mail.users.add-contact-otp');
    }
}
