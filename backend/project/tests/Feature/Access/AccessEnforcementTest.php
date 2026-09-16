<?php

namespace Tests\Feature\Access;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for per-endpoint ability enforcement.
 */
class AccessEnforcementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The administrator currently acting in the test.
     */
    protected Administrator $actor;

    /**
     * Authenticate an actor administrator carrying the given token abilities.
     *
     * @param  list<string>  $abilities
     */
    protected function actingWith(array $abilities): void
    {
        $this->actor = Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]);

        Sanctum::actingAs($this->actor, $abilities, 'administrators');
    }

    /**
     * A private file owned by the acting administrator (a valid `photo_uuid`).
     */
    protected function ownedPhotoUuid(): string
    {
        return File::factory()->create([
            'owner_type' => $this->actor->getMorphClass(),
            'owner_id' => $this->actor->getKey(),
        ])->uuid;
    }

    /**
     * administrators-view allows listing administrators.
     */
    public function test_view_allows_listing_administrators(): void
    {
        $this->actingWith(['administrators-view']);

        $this->getJson('/api/v1/administrator/administrators')->assertStatus(200);
    }

    /**
     * administrators-view alone cannot create an administrator.
     */
    public function test_view_forbids_creating_administrator(): void
    {
        $this->actingWith(['administrators-view']);

        $this->postJson('/api/v1/administrator/administrators', [])
            ->assertStatus(403)
            ->assertJson(['error' => 'insufficient_permissions']);
    }

    /**
     * administrators-view + administrators-manage can create an administrator.
     */
    public function test_manage_allows_creating_administrator(): void
    {
        $this->actingWith(['administrators-view', 'administrators-manage']);

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'new@admin.test',
            'first_name' => 'New',
            'last_name' => 'Admin',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ])->assertStatus(201);
    }

    /**
     * Listing roles is allowed with either roles-view or administrators-view.
     */
    public function test_roles_list_allows_either_view(): void
    {
        $this->actingWith(['roles-view']);
        $this->getJson('/api/v1/administrator/roles')->assertStatus(200);

        $this->actingWith(['administrators-view']);
        $this->getJson('/api/v1/administrator/roles')->assertStatus(200);
    }

    /**
     * Listing roles is forbidden without either view ability.
     */
    public function test_roles_list_forbidden_without_view(): void
    {
        $this->actingWith(['roles-manage']);

        $this->getJson('/api/v1/administrator/roles')
            ->assertStatus(403)
            ->assertJson(['error' => 'insufficient_permissions']);
    }

    /**
     * Creating a role requires roles-view + roles-manage.
     */
    public function test_role_create_requires_view_and_manage(): void
    {
        $this->actingWith(['roles-view']);
        $this->postJson('/api/v1/administrator/roles', ['name' => 'X'])->assertStatus(403);

        $this->actingWith(['roles-view', 'roles-manage']);
        $this->postJson('/api/v1/administrator/roles', ['name' => 'X'])->assertStatus(201);
    }

    /**
     * Listing permissions requires roles-view.
     */
    public function test_permissions_list_requires_roles_view(): void
    {
        $this->actingWith(['administrators-view']);
        $this->getJson('/api/v1/administrator/permissions')->assertStatus(403);

        $this->actingWith(['roles-view']);
        $this->getJson('/api/v1/administrator/permissions')->assertStatus(200);
    }
}
