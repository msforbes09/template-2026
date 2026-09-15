<?php

namespace Tests\Unit\Misc;

use App\Models\Concerns\SearchableLog;
use App\Models\Misc\Audits\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the Audit log's OpenSearch document contract. Its month comes from
 * `created_at`, and the heavy old/new value blobs stay in MySQL (not indexed).
 */
class AuditSearchableTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a persisted audit record with known values.
     */
    private function makeLog(): Audit
    {
        return Audit::create([
            'user_type' => 'Administrator',
            'user_id' => 5,
            'event' => 'updated',
            'auditable_type' => 'User',
            'auditable_id' => '42',
            'old_values' => ['status' => 'pending'],
            'new_values' => ['status' => 'approved'],
            'url' => 'https://api/x',
            'ip_address' => '10.0.0.1',
            'user_agent' => 'curl',
            'tags' => 'profile',
            'created_at' => '2026-08-06 14:30:00',
        ]);
    }

    /**
     * The model is a searchable log; its scout key/month come from created_at.
     */
    public function test_index_name_and_month_from_created_at(): void
    {
        config(['opensearch.migrations.prefixes.index' => 'acme_']);
        $log = $this->makeLog();

        $this->assertContains(SearchableLog::class, class_uses_recursive(Audit::class));
        $this->assertSame('audits', Audit::RESOURCE_KEY);
        $this->assertSame('acme_audits', $log->searchableAs());
        $this->assertSame('2026_08:'.$log->id, $log->getScoutKey());
    }

    /**
     * The document is the lean field set — no old/new value blobs.
     */
    public function test_to_searchable_array_is_lean_document(): void
    {
        $doc = $this->makeLog()->toSearchableArray();

        $this->assertSame([
            'id', 'month', 'user_type', 'user_id', 'event',
            'auditable_type', 'auditable_id', 'tags', 'created_at',
        ], array_keys($doc));

        $this->assertSame('updated', $doc['event']);
        $this->assertSame('2026_08', $doc['month']);
        $this->assertSame('2026-08-06 14:30:00', $doc['created_at']);
        $this->assertArrayNotHasKey('old_values', $doc);
        $this->assertArrayNotHasKey('new_values', $doc);
    }
}
