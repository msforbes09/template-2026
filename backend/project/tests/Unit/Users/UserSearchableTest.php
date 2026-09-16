<?php

namespace Tests\Unit\Users;

use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * User's OpenSearch document contract: the prefixed index name, the numeric scout
 * key, and the lean ZERO-PII document (ids, status flags, the four blind-index
 * hashes, dates) plus its mapping.
 */
class UserSearchableTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Index name = prefix + resource key; the key is the numeric id (single table).
     */
    public function test_index_name_and_key(): void
    {
        $user = User::factory()->create();

        $this->assertSame('template_users', $user->searchableAs());
        $this->assertSame($user->id, $user->getScoutKey());
    }

    /**
     * The document carries ids, status flags, the blind-index hashes and dates —
     * and no raw, masked, or encrypted PII of any kind.
     */
    public function test_document_shape(): void
    {
        $user = User::factory()->create();
        $doc = $user->fresh()->toSearchableArray();

        $this->assertSame([
            'id', 'uuid', 'status', 'is_active',
            'first_name_hash', 'last_name_hash', 'email_hash', 'mobile_number_hash',
            'created_at', 'updated_at', 'profile_completed_at',
        ], array_keys($doc));

        $this->assertSame($user->id, $doc['id']);
        $this->assertSame(1, $doc['is_active']);
        $this->assertSame($user->email_hash, $doc['email_hash']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $doc['created_at']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $doc['profile_completed_at']);

        foreach (['first_name', 'last_name', 'email', 'mobile_number', 'ciphertext', 'password', 'birth_date'] as $pii) {
            $this->assertArrayNotHasKey($pii, $doc);
        }
    }

    /**
     * The mapping types every document field and matches the document's keys.
     */
    public function test_mapping(): void
    {
        $mapping = User::searchableMapping();

        $this->assertSame('keyword', $mapping['status']['type']);
        $this->assertSame('keyword', $mapping['email_hash']['type']);
        $this->assertSame('integer', $mapping['is_active']['type']);
        $this->assertSame('date', $mapping['profile_completed_at']['type']);
        $this->assertSame('yyyy-MM-dd HH:mm:ss', $mapping['profile_completed_at']['format']);
        $this->assertSame(array_keys((new User)->toSearchableArray()), array_keys($mapping));
    }
}
