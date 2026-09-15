<?php

namespace App\Events\Connections;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired after an outbound external call completes (success or failure), carrying
 * the already-redacted log record for the queued listener to persist.
 */
class ConnectionRequested
{
    use Dispatchable;

    /**
     * @param  array<string, mixed>  $record  Redacted connection log record.
     */
    public function __construct(public array $record) {}
}
