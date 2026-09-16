<?php

namespace Tests\Feature\Logs;

use App\Models\Misc\Connections\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Mockery;
use OpenSearch\Client;
use Tests\TestCase;

/**
 * Verifies the log backfill command bulk-indexes existing MySQL rows (across month
 * tables) into their OpenSearch alias, keyed by the composite scout id.
 */
class BackfillLogsCommandTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create a connection log stamped in a given month.
     */
    private function makeLog(string $requestedAt): Connection
    {
        return Connection::create([
            'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
            'status_code' => '200', 'duration_ms' => 10, 'requested_at' => $requestedAt,
        ]);
    }

    /**
     * The command bulk-indexes each existing row into its alias with `_id` = the
     * composite scout key, spanning month tables.
     */
    public function test_backfills_rows_across_months(): void
    {
        Carbon::setTestNow('2026-08-15 09:00:00');

        // One row this month, one in last month's table (time-travel to write it there).
        $current = $this->makeLog('2026-08-10 10:00:00');
        Carbon::setTestNow('2026-07-15 09:00:00');
        $previous = $this->makeLog('2026-07-10 10:00:00');
        Carbon::setTestNow('2026-08-15 09:00:00');

        $bulkBodies = [];
        $client = Mockery::mock(Client::class);
        $client->shouldReceive('bulk')->andReturnUsing(function (array $params) use (&$bulkBodies) {
            $bulkBodies[] = $params['body'];

            return ['errors' => false, 'items' => []];
        });
        $this->app->instance(Client::class, $client);

        $this->artisan('opensearch:backfill-logs', ['--model' => 'connections', '--months' => 2])
            ->assertSuccessful();

        // Flatten all action/doc lines from the bulk calls.
        $lines = array_merge(...$bulkBodies);
        $ids = collect($lines)->pluck('index._id')->filter()->values()->all();

        $this->assertContains('2026_08:'.$current->id, $ids);
        $this->assertContains('2026_07:'.$previous->id, $ids);
        // Indexed into the write alias.
        $indices = collect($lines)->pluck('index._index')->filter()->unique()->all();
        $this->assertSame(['template_connections'], $indices);
    }
}
