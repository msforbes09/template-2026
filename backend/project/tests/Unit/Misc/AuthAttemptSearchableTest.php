<?php

namespace Tests\Unit\Misc;

use App\Models\Concerns\SearchableLog;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Services\Security\PiiMasker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the AuthAttempt log's OpenSearch document contract. Its month comes from
 * `attempted_at`, and the raw `identifier` (admin PII) is never indexed — only the
 * blind-index `identifier_hash`.
 */
class AuthAttemptSearchableTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a persisted auth-attempt with known values.
     */
    private function makeLog(): AuthAttempt
    {
        return AuthAttempt::create([
            'guard' => 'users',
            'event' => 'login_failed',
            'identifier' => 'secret@example.com',
            'identifier_hash' => 'abc123',
            'user_type' => 'User',
            'user_id' => 42,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'curl',
            'attempted_at' => '2026-08-06 14:30:00',
        ]);
    }

    /**
     * The model is a searchable log; its scout key/month come from attempted_at.
     */
    public function test_index_name_and_month_from_attempted_at(): void
    {
        config(['opensearch.migrations.prefixes.index' => 'acme_']);
        $log = $this->makeLog();

        $this->assertContains(SearchableLog::class, class_uses_recursive(AuthAttempt::class));
        $this->assertSame('auth_attempts', AuthAttempt::RESOURCE_KEY);
        $this->assertSame('acme_auth_attempts', $log->searchableAs());
        $this->assertSame('2026_08:'.$log->id, $log->getScoutKey());
    }

    /**
     * The document indexes the MASKED identifier (as stored — the recorder never writes
     * a raw address) plus the hash; the user agent stays MySQL-only.
     */
    public function test_to_searchable_array_indexes_masked_identifier_and_hash(): void
    {
        $doc = $this->makeLog()->toSearchableArray();

        $this->assertSame([
            'id', 'month', 'guard', 'event', 'identifier', 'identifier_hash',
            'user_type', 'user_id', 'ip_address', 'attempted_at',
        ], array_keys($doc));

        $this->assertSame('abc123', $doc['identifier_hash']);
        $this->assertSame('2026-08-06 14:30:00', $doc['attempted_at']);
        $this->assertArrayNotHasKey('user_agent', $doc);
    }

    /**
     * F10 — the indexed + listed identifier is defensively masked, so a legacy row
     * that was written raw (pre-masking) is never surfaced in cleartext on the
     * list or in the OpenSearch document.
     */
    public function test_raw_identifier_is_masked_on_list_and_index(): void
    {
        $log = $this->makeLog(); // stores a raw 'secret@example.com' (legacy shape)
        $expected = PiiMasker::maskIdentifier('secret@example.com');

        $this->assertNotSame('secret@example.com', $log->toSearchableArray()['identifier']);
        $this->assertSame($expected, $log->toSearchableArray()['identifier']);
        $this->assertSame($expected, $log->toListArray()['identifier']);
    }
}
