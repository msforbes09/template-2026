<?php

namespace Tests\Feature\Logs;

use App\Models\Misc\Audits\Audit;
use App\Models\Misc\Connections\Connection;
use App\Services\Logs\LogQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use OpenSearch\Client;
use Tests\TestCase;

/**
 * Verifies the log-type-agnostic query abstraction: it reads from the model's
 * OpenSearch write alias (with the right DSL + the model's own date column) when the
 * read path is enabled, and falls back to the MySQL monthly tables on error/disabled.
 */
class LogQueryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A canned OpenSearch response with one connection-log hit.
     *
     * @return array<string, mixed>
     */
    private function oneConnectionHit(): array
    {
        return ['hits' => ['total' => ['value' => 1], 'hits' => [[
            '_source' => [
                'id' => 5, 'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
                'status_code' => '200', 'duration_ms' => 10, 'requested_at' => '2026-08-14 10:00:00',
            ],
        ]]]];
    }

    /**
     * A mock client capturing the search params and returning one hit.
     */
    private function capturingClient(?array &$captured, array $response): Client
    {
        $client = Mockery::mock(Client::class);
        $client->shouldReceive('search')->andReturnUsing(function (array $params) use (&$captured, $response) {
            $captured = $params;

            return $response;
        });

        return $client;
    }

    /**
     * A connection-log query hits the connections alias, sorts by requested_at, and applies
     * the term + date-range filters + pagination.
     */
    public function test_connection_query_dsl(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;

        $paginator = (new LogQuery($this->capturingClient($captured, $this->oneConnectionHit())))->list(
            Connection::class,
            ['terms' => ['type' => 'alpha'], 'from' => '2026-08-01', 'to' => '2026-08-31'],
            perPage: 20,
            page: 2,
        );

        $this->assertSame('template_connections', $captured['index']);
        $filters = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['term' => ['type' => 'alpha']], $filters);
        $range = collect($filters)->firstWhere('range.requested_at.gte', '2026-08-01 00:00:00');
        $this->assertSame('2026-08-31 23:59:59', $range['range']['requested_at']['lte']);
        $this->assertSame(20, $captured['body']['from']); // (page 2 - 1) * 20
        $this->assertSame('desc', $captured['body']['sort'][0]['requested_at']['order']);

        $this->assertSame(1, $paginator->total());
        $this->assertSame('alpha', $paginator->items()[0]->type);
    }

    /**
     * A different log type uses its own alias and date column for range/sort.
     */
    public function test_audit_query_uses_its_own_alias_and_date_column(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;
        $response = ['hits' => ['total' => ['value' => 0], 'hits' => []]];

        (new LogQuery($this->capturingClient($captured, $response)))->list(
            Audit::class,
            ['terms' => ['event' => 'updated'], 'from' => '2026-08-01'],
            perPage: 20,
            page: 1,
        );

        $this->assertSame('template_audits', $captured['index']);
        $this->assertContains(['term' => ['event' => 'updated']], $captured['body']['query']['bool']['filter']);
        // Range + sort key on the audit date column, not requested_at.
        $range = collect($captured['body']['query']['bool']['filter'])->firstWhere('range.created_at.gte', '2026-08-01 00:00:00');
        $this->assertNotNull($range);
        $this->assertSame('created_at', array_key_first($captured['body']['sort'][0]));
    }

    /**
     * A status_code class like "5xx" becomes a 500–599 range query, not an exact
     * term — so a caller can filter a whole status class.
     */
    public function test_status_code_class_becomes_a_range_in_opensearch(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;

        (new LogQuery($this->capturingClient($captured, $this->oneConnectionHit())))->list(
            Connection::class,
            ['terms' => ['status_code' => '5xx']],
            perPage: 20,
            page: 1,
        );

        $filters = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['range' => ['status_code' => ['gte' => '500', 'lte' => '599']]], $filters);
        $this->assertNotContains(['term' => ['status_code' => '5xx']], $filters);
    }

    /**
     * A plain status code stays an exact-match term.
     */
    public function test_exact_status_code_stays_a_term_in_opensearch(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;

        (new LogQuery($this->capturingClient($captured, $this->oneConnectionHit())))->list(
            Connection::class,
            ['terms' => ['status_code' => '404']],
            perPage: 20,
            page: 1,
        );

        $this->assertContains(['term' => ['status_code' => '404']], $captured['body']['query']['bool']['filter']);
    }

    /**
     * The MySQL fallback applies the same status-class range (500–599).
     */
    public function test_status_code_class_becomes_a_range_in_mysql(): void
    {
        config(['opensearch.read.enabled' => false]);
        foreach (['200', '404', '500', '502', '599'] as $code) {
            Connection::create([
                'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
                'status_code' => $code, 'duration_ms' => 5, 'requested_at' => now(),
            ]);
        }

        $client = Mockery::mock(Client::class);
        $paginator = (new LogQuery($client))->list(Connection::class, ['terms' => ['status_code' => '5xx']], perPage: 20, page: 1);

        $codes = collect($paginator->items())->pluck('status_code')->sort()->values()->all();
        $this->assertSame(['500', '502', '599'], $codes);
    }

    /**
     * On an OpenSearch error, list() falls back to the MySQL monthly tables.
     */
    public function test_falls_back_to_mysql_on_error(): void
    {
        config(['opensearch.read.enabled' => true]);
        $log = Connection::create([
            'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
            'status_code' => '200', 'duration_ms' => 5, 'requested_at' => now(),
        ]);

        $client = Mockery::mock(Client::class);
        $client->shouldReceive('search')->andThrow(new \RuntimeException('cluster down'));

        $paginator = (new LogQuery($client))->list(Connection::class, ['terms' => ['type' => 'alpha']], perPage: 20, page: 1);

        $this->assertSame(1, $paginator->total());
        $this->assertSame($log->id, $paginator->items()[0]->id);
    }

    /**
     * With the read path disabled, list() never touches OpenSearch.
     */
    public function test_reads_mysql_when_disabled(): void
    {
        config(['opensearch.read.enabled' => false]);
        Connection::create([
            'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
            'status_code' => '200', 'duration_ms' => 5, 'requested_at' => now(),
        ]);

        $client = Mockery::mock(Client::class);
        $client->shouldNotReceive('search');

        $paginator = (new LogQuery($client))->list(Connection::class, [], perPage: 20, page: 1);

        $this->assertSame(1, $paginator->total());
    }
}
