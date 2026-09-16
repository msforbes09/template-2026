<?php

namespace Tests\Feature\Access;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for the roles CRUD endpoints.
 */
class RoleCrudTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate a usable actor administrator before each test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(
            Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]),
            ['roles-view', 'roles-manage'],
            'administrators',
        );
    }

    /**
     * The list endpoint returns paginated roles — the three created here plus the
     * seeded Super Admin role, which every deployment carries.
     */
    public function test_list_roles(): void
    {
        Role::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/administrator/roles');

        $response->assertStatus(200);
        $response->assertJsonCount(4, 'data');
    }

    /**
     * Each list row says how many administrators hold the role. Deactivated
     * admins still count — holding a role is not the same as being able to
     * sign in, and deactivation is reversible — while soft-deleted admins do
     * not, even though their pivot rows survive the delete.
     */
    public function test_list_carries_how_many_admins_hold_each_role(): void
    {
        $role = Role::factory()->create(['name' => 'Assessor']);
        Role::factory()->create(['name' => 'Dormant']);

        Administrator::factory()->create()->assignRole($role);
        Administrator::factory()->create(['is_active' => false])->assignRole($role);
        $trashed = Administrator::factory()->create();
        $trashed->assignRole($role);
        $trashed->delete();

        $rows = collect($this->getJson('/api/v1/administrator/roles')->assertOk()->json('data'));

        $this->assertSame(2, $rows->firstWhere('name', 'Assessor')['admins_count']);
        $this->assertSame(0, $rows->firstWhere('name', 'Dormant')['admins_count']);
    }

    /**
     * A role can be created with the administrators guard applied server-side.
     */
    public function test_create_role(): void
    {
        $response = $this->postJson('/api/v1/administrator/roles', [
            'name' => 'Content Editor',
            'description' => 'Manages content',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.name', 'Content Editor');
        $this->assertDatabaseHas('roles', ['name' => 'Content Editor', 'guard_name' => 'administrators']);
    }

    /**
     * Duplicate role names (non-trashed) are rejected.
     */
    public function test_create_role_rejects_duplicate_name(): void
    {
        Role::factory()->create(['name' => 'Editor']);

        $this->postJson('/api/v1/administrator/roles', ['name' => 'Editor'])
            ->assertStatus(422);
    }

    /**
     * Showing a role includes its permissions.
     */
    public function test_show_role_includes_permissions(): void
    {
        $role = Role::factory()->create();
        $role->syncPermissions([Permission::factory()->create()->id]);

        $response = $this->getJson("/api/v1/administrator/roles/{$role->id}");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data.permissions');
    }

    /**
     * A role can be updated.
     */
    public function test_update_role(): void
    {
        $role = Role::factory()->create(['name' => 'Old']);

        $this->putJson("/api/v1/administrator/roles/{$role->id}", ['name' => 'New'])
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'New');
    }

    /**
     * A role can be soft-deleted.
     */
    public function test_delete_role(): void
    {
        $role = Role::factory()->create();

        $this->deleteJson("/api/v1/administrator/roles/{$role->id}")->assertStatus(200);

        $this->assertSoftDeleted('roles', ['id' => $role->id]);
    }

    /**
     * A missing role returns the data_not_found envelope.
     */
    public function test_show_missing_role_returns_404(): void
    {
        $this->getJson('/api/v1/administrator/roles/999999')->assertStatus(404);
    }
}
