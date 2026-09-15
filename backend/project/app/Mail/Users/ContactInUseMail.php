<?php

namespace App\Mail\Users;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Notifies the owner of an email that someone tried to add it to a different
 * account. Sent instead of an OTP when the email is already in use, so the
 * add-contact response stays identical whether or not it is taken
 * (anti-enumeration). Carries no PIN — the attempt cannot be completed.
 */
class ContactInUseMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * The unused PIN is accepted so the mailable shares OtpMailer's
     * `new $mailable($result->pin)` construction, but it is never shown.
     */
    public function __construct(public readonly string $pin = '') {}

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your email is already registered');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(view: 'mail.users.contact-in-use');
    }
}
