<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * A simple test email used to verify mail and queue delivery.
 */
class TestMailerMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * Build the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: config('app.name').' mailer test');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(markdown: 'mail.test-mailer');
    }
}
