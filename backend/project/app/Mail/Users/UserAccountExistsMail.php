<?php

namespace App\Mail\Users;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Notifies the owner of an already-registered email that a fresh registration
 * was attempted — sent instead of the OTP so a real account holder is not asked
 * to "finish creating" an account they already have.
 *
 * Resolved by OtpMailer for the `user_registration_exists` OTP type, so its
 * constructor accepts (and ignores) the generated PIN like every OTP mailable.
 * Delivered by the queued, encrypted SendOtp listener, so it needs no queue
 * guarantees itself. The API response is identical to the new-email case, so this
 * never discloses account existence to the requester.
 */
class UserAccountExistsMail extends Mailable
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
        return new Envelope(subject: 'You already have an account');
    }

    /**
     * Build the message content (Markdown view).
     */
    public function content(): Content
    {
        return new Content(view: 'mail.users.account-exists');
    }
}
