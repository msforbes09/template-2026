<?php

namespace Tests\Feature\Contents;

use App\Models\Contents\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the Content model basics.
 */
class ContentModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * body + meta cast to array (stored in text columns); soft delete works.
     */
    public function test_casts_and_soft_deletes(): void
    {
        $content = Content::create(['identifier' => 'terms-of-service', 'body' => ['en' => 'Hello'], 'meta' => ['title' => 'Terms']]);

        $this->assertSame(['en' => 'Hello'], $content->fresh()->body);
        $this->assertSame(['title' => 'Terms'], $content->fresh()->meta);
        $content->delete();
        $this->assertSoftDeleted($content);
    }
}
