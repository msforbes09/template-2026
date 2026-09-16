<?php

namespace Tests\Feature\Access;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for syncing a role's permissions.
 */
class SyncRolePermissionsTest extends TestCase
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
     * Syncing assigns permissions and returns the role with them loaded.
     */
    public function test_sync_permissions_assigns_and_returns(): void
    {
        $role = Role::factory()->create();
        $permissions = Permission::factory()->count(2)->create();

        // An admin may only grant permissions their own session holds, so the actor
        // has to carry these two as well — see PermissionAmplificationTest.
        Sanctum::actingAs(
            Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]),
            ['roles-view', 'roles-manage', ...$permissions->pluck('name')->all()],
            'administrators',
        );

        $response = $this->postJson(
            "/api/v1/administrator/roles/{$role->id}/sync-permissions",
            ['permission_ids' => $permissions->pluck('id')->all()],
        );

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data.permissions');
        $this->assertCount(2, $role->fresh()->permissions);
    }

    /**
     * R1 — syncing a role's permissions revokes the sessions of every admin holding
     * that role, so a just-changed permission set can't be exercised (or re-granted)
     * from a stale login-time token snapshot.
     */
    public function test_sync_permissions_revokes_holders_tokens(): void
    {
        $permissions = Permission::factory()->count(1)->create();
        $role = Role::factory()->create();

        $holder = Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]);
        $holder->assignRole($role);
        $holder->createToken('live'); // a real, persisted session
        $this->assertSame(1, $holder->tokens()->count());

        Sanctum::actingAs(
            Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]),
            ['roles-view', 'roles-manage', ...$permissions->pluck('name')->all()],
            'administrators',
        );

        $this->postJson(
            "/api/v1/administrator/roles/{$role->id}/sync-permissions",
            ['permission_ids' => $permissions->pluck('id')->all()],
        )->assertOk();

        $this->assertSame(0, $holder->fresh()->tokens()->count(), 'the role holder\'s tokens must be revoked');
    }

    /**
     * Unknown permission ids are rejected.
     */
    public function test_sync_permissions_rejects_unknown_ids(): void
    {
        $role = Role::factory()->create();

        $this->postJson(
            "/api/v1/administrator/roles/{$role->id}/sync-permissions",
            ['permission_ids' => [999999]],
        )->assertStatus(422);
    }
}
