<?php

namespace Tests\Feature\Contents;

use App\Models\Administrators\Administrator;
use App\Models\Contents\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests admin content CRUD + ability enforcement.
 */
class ContentAdminCrudTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an administrator with the given token abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    /**
     * Create with a valid payload.
     */
    public function test_create(): void
    {
        $this->actingWith(['contents-view', 'contents-manage']);

        $this->postJson('/api/v1/administrator/contents', ['identifier' => 'faq', 'body' => ['en' => 'Q&A'], 'meta' => ['t' => 1]])
            ->assertCreated()->assertJsonPath('data.identifier', 'faq')->assertJsonPath('data.body.en', 'Q&A');
    }

    /**
     * Duplicate identifier is rejected.
     */
    public function test_duplicate_identifier_rejected(): void
    {
        $this->actingWith(['contents-view', 'contents-manage']);
        Content::factory()->create(['identifier' => 'faq']);

        $this->postJson('/api/v1/administrator/contents', ['identifier' => 'faq'])
            ->assertStatus(422)->assertJsonValidationErrors('identifier');
    }

    /**
     * body is required on create.
     */
    public function test_body_is_required(): void
    {
        $this->actingWith(['contents-view', 'contents-manage']);

        $this->postJson('/api/v1/administrator/contents', ['identifier' => 'faq'])
            ->assertStatus(422)->assertJsonValidationErrors('body');
    }

    /**
     * A bad-format identifier is rejected.
     */
    public function test_bad_identifier_rejected(): void
    {
        $this->actingWith(['contents-view', 'contents-manage']);

        $this->postJson('/api/v1/administrator/contents', ['identifier' => 'Bad Ident!'])
            ->assertStatus(422)->assertJsonValidationErrors('identifier');
    }

    /**
     * Writes require the contents-manage ability.
     */
    public function test_write_requires_manage(): void
    {
        $this->actingWith(['contents-view']);

        $this->postJson('/api/v1/administrator/contents', ['identifier' => 'faq'])->assertStatus(403);
    }

    /**
     * Update then soft-delete.
     */
    public function test_update_and_delete(): void
    {
        $this->actingWith(['contents-view', 'contents-manage']);
        $content = Content::factory()->create(['identifier' => 'faq']);

        $this->putJson("/api/v1/administrator/contents/{$content->id}", ['body' => ['en' => 'new']])
            ->assertOk()->assertJsonPath('data.body.en', 'new');

        $this->deleteJson("/api/v1/administrator/contents/{$content->id}")->assertOk();
        $this->assertSoftDeleted($content);
    }
}
