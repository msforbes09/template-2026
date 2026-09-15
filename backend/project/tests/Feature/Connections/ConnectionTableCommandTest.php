<?php

namespace Tests\Feature\Connections;

use App\Models\Misc\Connections\Connection;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests the next-month connection table command.
 */
class ConnectionTableCommandTest extends TestCase
{
    /**
     * The command pre-creates next month's table on the logging connection.
     */
    public function test_prepares_next_month_table(): void
    {
        $next = (new Connection)->getTableForMonth(now()->addMonth());

        $this->assertFalse(Schema::connection((new Connection)->getConnectionName())->hasTable($next));

        $this->artisan('connection:prepare-next-table')->assertSuccessful();

        $this->assertTrue(Schema::connection((new Connection)->getConnectionName())->hasTable($next));
    }
}
