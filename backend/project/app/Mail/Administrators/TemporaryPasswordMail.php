<?php

namespace App\Mail\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Emails an administrator their temporary password.
 */
class TemporaryPasswordMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  Administrator  $administrator  The recipient administrator.
     * @param  string  $temporaryPassword  The plaintext temporary password.
     */
    public function __construct(
        public readonly Administrator $administrator,
        public readonly string $temporaryPassword,
    ) {}

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your '.config('app.name').' temporary password');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(markdown: 'mail.administrators.temporary-password');
    }
}
