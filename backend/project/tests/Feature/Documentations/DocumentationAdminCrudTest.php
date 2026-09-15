<?php

namespace Tests\Feature\Documentations;

use App\Models\Administrators\Administrator;
use App\Models\Documentations\Documentation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests admin documentation CRUD + ability enforcement.
 */
class DocumentationAdminCrudTest extends TestCase
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
        $this->actingWith(['documentations-view', 'documentations-manage']);

        $this->postJson('/api/v1/administrator/documentations', ['identifier' => 'getting-started', 'body' => ['en' => 'Docs'], 'meta' => ['t' => 1]])
            ->assertCreated()->assertJsonPath('data.identifier', 'getting-started')->assertJsonPath('data.body.en', 'Docs');
    }

    /**
     * Duplicate identifier is rejected.
     */
    public function test_duplicate_identifier_rejected(): void
    {
        $this->actingWith(['documentations-view', 'documentations-manage']);
        Documentation::factory()->create(['identifier' => 'getting-started']);

        $this->postJson('/api/v1/administrator/documentations', ['identifier' => 'getting-started', 'body' => ['en' => 'x']])
            ->assertStatus(422)->assertJsonValidationErrors('identifier');
    }

    /**
     * body is required on create.
     */
    public function test_body_is_required(): void
    {
        $this->actingWith(['documentations-view', 'documentations-manage']);

        $this->postJson('/api/v1/administrator/documentations', ['identifier' => 'getting-started'])
            ->assertStatus(422)->assertJsonValidationErrors('body');
    }

    /**
     * Writes require the documentations-manage ability.
     */
    public function test_write_requires_manage(): void
    {
        $this->actingWith(['documentations-view']);

        $this->postJson('/api/v1/administrator/documentations', ['identifier' => 'getting-started', 'body' => ['en' => 'x']])->assertStatus(403);
    }

    /**
     * Update then soft-delete.
     */
    public function test_update_and_delete(): void
    {
        $this->actingWith(['documentations-view', 'documentations-manage']);
        $documentation = Documentation::factory()->create(['identifier' => 'getting-started']);

        $this->putJson("/api/v1/administrator/documentations/{$documentation->id}", ['body' => ['en' => 'new']])
            ->assertOk()->assertJsonPath('data.body.en', 'new');

        $this->deleteJson("/api/v1/administrator/documentations/{$documentation->id}")->assertOk();
        $this->assertSoftDeleted($documentation);
    }
}
