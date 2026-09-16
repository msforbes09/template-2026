<?php

namespace Tests\Feature\Connections;

use App\Events\Connections\ConnectionRequested;
use App\Models\Misc\Connections\Connection;
use Tests\TestCase;

/**
 * Tests that the queued listener persists a dispatched connection record.
 */
class LogConnectionListenerTest extends TestCase
{
    /**
     * Dispatching the event writes a Connection row (sync queue in tests).
     */
    public function test_persists_the_connection_record(): void
    {
        ConnectionRequested::dispatch([
            'type' => 'payments',
            'reference' => 'EXC-9',
            'method' => 'POST',
            'url' => 'https://svc.example/token',
            'headers' => [],
            'params' => [],
            'payload' => [],
            'response' => ['ok' => 1],
            'status_code' => 200,
            'duration_ms' => 12,
            'exception' => null,
            'ip_address' => null,
            'user_type' => null,
            'user_id' => null,
            'requested_at' => now(),
        ]);

        $this->assertTrue(Connection::where('reference', 'EXC-9')->exists());
    }
}
