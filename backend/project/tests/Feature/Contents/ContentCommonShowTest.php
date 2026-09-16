<?php

namespace Tests\Feature\Contents;

use App\Models\Contents\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the public common content show.
 */
class ContentCommonShowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Public GET by identifier returns the content; unknown/trashed -> 404; updates bust the cache.
     */
    public function test_public_show(): void
    {
        $content = Content::factory()->create(['identifier' => 'faq', 'body' => ['t' => 'v1']]);

        $this->getJson('/api/v1/common/contents/faq')->assertOk()->assertJsonPath('data.body.t', 'v1');
        $this->getJson('/api/v1/common/contents/missing')->assertNotFound()->assertJsonPath('error', 'data_not_found');

        $content->update(['body' => ['t' => 'v2']]);
        $this->getJson('/api/v1/common/contents/faq')->assertJsonPath('data.body.t', 'v2');

        $content->delete();
        $this->getJson('/api/v1/common/contents/faq')->assertNotFound();
    }

    /**
     * Null body/meta are returned as empty arrays.
     */
    public function test_null_body_and_meta_are_empty_arrays(): void
    {
        Content::create(['identifier' => 'blank', 'body' => null, 'meta' => null]);

        $this->getJson('/api/v1/common/contents/blank')
            ->assertOk()
            ->assertJsonPath('data.body', [])
            ->assertJsonPath('data.meta', []);
    }
}
