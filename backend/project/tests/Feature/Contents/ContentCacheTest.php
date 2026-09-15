<?php

namespace Tests\Feature\Contents;

use App\Models\Contents\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Tests identifier-keyed caching + busting.
 */
class ContentCacheTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A hit is cached; a save busts it (incl. rename).
     */
    public function test_cache_hit_and_bust(): void
    {
        $content = Content::create(['identifier' => 'faq', 'body' => ['t' => 'v1']]);

        Content::findCachedByIdentifier('faq');
        $this->assertTrue(Cache::has(Content::CACHE_PREFIX.'faq'));

        $content->update(['body' => ['t' => 'v2']]);
        $this->assertFalse(Cache::has(Content::CACHE_PREFIX.'faq'));

        Content::findCachedByIdentifier('faq');
        $content->update(['identifier' => 'faqs']);
        $this->assertFalse(Cache::has(Content::CACHE_PREFIX.'faq'));
        $this->assertFalse(Cache::has(Content::CACHE_PREFIX.'faqs'));
    }

    /**
     * A miss is not cached.
     */
    public function test_miss_not_cached(): void
    {
        $this->assertNull(Content::findCachedByIdentifier('nope'));
        $this->assertFalse(Cache::has(Content::CACHE_PREFIX.'nope'));
    }

    /**
     * The cache holds the raw attribute array (not the Eloquent model, which
     * would deserialize to __PHP_Incomplete_Class on serializing stores), and a
     * cache hit rehydrates a proper Content.
     */
    public function test_caches_attribute_array_and_rehydrates(): void
    {
        Content::create(['identifier' => 'faq', 'body' => ['t' => 'v1']]);

        Content::findCachedByIdentifier('faq');
        $this->assertIsArray(Cache::get(Content::CACHE_PREFIX.'faq'));

        $hit = Content::findCachedByIdentifier('faq');
        $this->assertInstanceOf(Content::class, $hit);
        $this->assertSame(['t' => 'v1'], $hit->body);
    }
}
