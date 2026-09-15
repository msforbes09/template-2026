<?php

namespace Tests\Unit\Misc;

use App\Models\Concerns\SearchableLog;
use App\Models\Misc\Connections\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the Connection log's OpenSearch document contract: prefixed index name,
 * month-scoped scout key, and the lean (blob-free) document shape.
 */
class ConnectionSearchableTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a persisted connection log with known values.
     */
    private function makeLog(): Connection
    {
        return Connection::create([
            'type' => 'sms',
            'reference' => 'ref-1',
            'method' => 'POST',
            'url' => 'https://partner/api',
            'headers' => ['x' => 'y'],
            'payload' => ['a' => 'b'],
            'response' => ['ok' => true],
            'status_code' => '200',
            'duration_ms' => 88,
            'user_type' => 'User',
            'user_id' => 42,
            'requested_at' => '2026-08-06 14:30:00',
        ]);
    }

    /**
     * The model is a searchable log with the expected index name and key.
     */
    public function test_index_name_and_scout_key(): void
    {
        config(['opensearch.migrations.prefixes.index' => 'acme_']);
        $log = $this->makeLog();

        $this->assertContains(SearchableLog::class, class_uses_recursive(Connection::class));
        $this->assertSame('connections', Connection::RESOURCE_KEY);
        $this->assertSame('acme_connections', $log->searchableAs());
        $this->assertSame('2026_08:'.$log->id, $log->getScoutKey());
    }

    /**
     * The document is the lean field set — no headers/payload/response blobs.
     */
    public function test_to_searchable_array_is_lean_document(): void
    {
        $doc = $this->makeLog()->toSearchableArray();

        $this->assertSame([
            'id', 'month', 'type', 'reference', 'method', 'url', 'status_code',
            'duration_ms', 'user_type', 'user_id', 'requested_at',
        ], array_keys($doc));

        $this->assertSame('sms', $doc['type']);
        $this->assertSame('2026_08', $doc['month']);
        $this->assertSame('2026-08-06 14:30:00', $doc['requested_at']);
        $this->assertArrayNotHasKey('payload', $doc);
        $this->assertArrayNotHasKey('response', $doc);
    }
}
