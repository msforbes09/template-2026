<?php

namespace Tests\Feature\Documentations;

use App\Models\Documentations\Documentation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the Documentation model basics.
 */
class DocumentationModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * body + meta cast to array (stored in text columns); soft delete works.
     */
    public function test_casts_and_soft_deletes(): void
    {
        $documentation = Documentation::create(['identifier' => 'getting-started', 'body' => ['en' => 'Hello'], 'meta' => ['title' => 'Getting Started']]);

        $this->assertSame(['en' => 'Hello'], $documentation->fresh()->body);
        $this->assertSame(['title' => 'Getting Started'], $documentation->fresh()->meta);
        $documentation->delete();
        $this->assertSoftDeleted($documentation);
    }
}
