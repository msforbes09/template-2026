<?php

namespace Tests\Feature\Common;

use App\Models\Contents\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the public (common) content list endpoint.
 */
class CommonContentListTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The endpoint lists content blocks without authentication.
     */
    public function test_lists_contents_publicly(): void
    {
        Content::factory()->create(['identifier' => 'terms-of-service']);
        Content::factory()->create(['identifier' => 'privacy-policy']);

        $this->getJson('/api/v1/common/contents')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['identifier', 'body', 'meta']]]);
    }

    /**
     * The list is filterable by identifier.
     */
    public function test_filters_by_identifier(): void
    {
        Content::factory()->create(['identifier' => 'terms-of-service']);
        Content::factory()->create(['identifier' => 'privacy-policy']);

        $this->getJson('/api/v1/common/contents?identifier=privacy-policy')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.identifier', 'privacy-policy');
    }
}
