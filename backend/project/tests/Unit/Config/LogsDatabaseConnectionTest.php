<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * Pins the fallback of the shared logs connection: with no DB_LOGS_DATABASE set,
 * connection and auth-attempt logs land in the primary database rather than a
 * database that only exists once someone creates it by hand.
 */
class LogsDatabaseConnectionTest extends TestCase
{
    /**
     * The logs connection uses the primary database when DB_LOGS_DATABASE is unset.
     */
    public function test_logs_connection_falls_back_to_the_primary_database(): void
    {
        $this->assertNull(env('DB_LOGS_DATABASE'));

        $this->assertSame(
            config('database.connections.mysql.database'),
            config('database.connections.mysql-logs.database'),
        );
    }
}
