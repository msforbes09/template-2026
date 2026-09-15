<?php

namespace App\Mail\Administrators;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Emails an administrator their two-factor verification PIN.
 */
class Admin2faOtpMail extends Mailable
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
        return new Envelope(subject: 'Your '.config('app.name').' verification code');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(markdown: 'mail.administrators.2fa-otp');
    }
}
