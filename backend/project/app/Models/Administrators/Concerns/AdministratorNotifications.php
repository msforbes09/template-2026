<?php

namespace App\Models\Administrators\Concerns;

use App\Mail\Administrators\TemporaryPasswordMail;
use Illuminate\Support\Facades\Mail;

/**
 * Administrator-specific outbound email notifications.
 */
trait AdministratorNotifications
{
    /**
     * Email the administrator their temporary password (sent synchronously).
     */
    public function sendTemporaryPassword(string $temporaryPassword): void
    {
        Mail::to($this->email)->send(new TemporaryPasswordMail($this, $temporaryPassword));

        // Log::info('Temporary password emailed to administrator.', ['email' => $this->email]);
    }
}
