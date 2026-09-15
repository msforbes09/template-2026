<?php

namespace App\Listeners\Administrators;

use App\Events\Administrators\TemporaryPasswordIssued;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Sends the temporary-password email when one is issued. Queued on `mailer`.
 *
 * `ShouldBeEncrypted` is load-bearing: a queued listener serialises its event into
 * the `jobs` table, so the plaintext temporary password sat in the database until the
 * job ran — and indefinitely in `failed_jobs` if it did not. Encrypting the payload
 * keeps the delivery asynchronous (no SMTP latency on the request) while the secret
 * never touches storage in the clear.
 */
class SendTemporaryPasswordEmail implements ShouldBeEncrypted, ShouldQueue
{
    /**
     * The queue this listener is pushed onto.
     */
    public string $queue = 'mailer';

    /**
     * Handle the event.
     */
    public function handle(TemporaryPasswordIssued $event): void
    {
        $event->administrator->sendTemporaryPassword($event->temporaryPassword);
    }
}
