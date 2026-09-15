<?php

namespace App\Listeners\Connections;

use App\Events\Connections\ConnectionRequested;
use App\Models\Misc\Connections\Connection;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Persists a redacted connection record to the monthly log table. Queued so
 * logging never blocks the outbound call's caller. Auto-discovered by the
 * handle() type-hint.
 */
class LogConnection implements ShouldQueue
{
    /**
     * The queue this listener runs on.
     */
    public string $queue = 'connection';

    /**
     * Number of attempts.
     */
    public int $tries = 3;

    /**
     * Handle the event.
     */
    public function handle(ConnectionRequested $event): void
    {
        Connection::create($event->record);
    }
}
