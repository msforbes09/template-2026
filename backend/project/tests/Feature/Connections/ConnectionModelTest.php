<?php

namespace Tests\Feature\Connections;

use App\Models\Misc\Connections\Connection;
use Tests\TestCase;

/**
 * Tests the Connection log model (monthly table + array casts).
 */
class ConnectionModelTest extends TestCase
{
    /**
     * The table resolves to the current month and rows persist with array casts.
     */
    public function test_persists_to_monthly_table_with_array_casts(): void
    {
        $this->assertSame('connections_'.now()->format('Y_m'), (new Connection)->getTable());

        $connection = Connection::create([
            'type' => 'payments',
            'reference' => 'EXC-123',
            'method' => 'POST',
            'url' => 'https://sso.example/api/token',
            'headers' => ['Accept' => 'application/json'],
            'payload' => ['scope' => 'SSO_AUTHENTICATION'],
            'response' => ['access_token' => '***'],
            'status_code' => 200,
            'duration_ms' => 245,
            'requested_at' => now(),
        ]);

        $fresh = $connection->fresh();
        $this->assertSame('payments', $fresh->type);
        $this->assertSame(['Accept' => 'application/json'], $fresh->headers);
        $this->assertSame(['scope' => 'SSO_AUTHENTICATION'], $fresh->payload);
        $this->assertSame(['access_token' => '***'], $fresh->response);
        $this->assertSame(245, $fresh->duration_ms);
    }
}
