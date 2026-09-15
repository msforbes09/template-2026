<?php

namespace Tests\Feature\Access;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * No privilege amplification: an administrator may only hand out permissions their
 * own session already holds.
 *
 * Without this, `roles-manage` is a blank cheque — an admin can mint a role holding
 * every permission and assign it, escalating without ever touching the Super Admin
 * role that the other guards seal.
 */
class PermissionAmplificationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Act as an admin whose session holds exactly the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingAdmin(array $abilities): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, $abilities, 'administrators');

        return $admin;
    }

    /**
     * A permission row by name.
     */
    private function permission(string $name): Permission
    {
        return Permission::query()->firstOrCreate([
            'name' => $name,
            'guard_name' => Administrator::AUTH_GUARD,
        ]);
    }

    /**
     * The escalation: an admin grants a role a permission their own session lacks,
     * then holds a role more powerful than themselves.
     */
    public function test_admin_cannot_grant_a_permission_their_session_lacks(): void
    {
        $this->actingAdmin(['roles-view', 'roles-manage']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $forbidden = $this->permission('administrators-manage');

        $this->postJson("/api/v1/administrator/roles/{$role->id}/sync-permissions", [
            'permission_ids' => [$forbidden->id],
        ])->assertStatus(422)->assertJsonValidationErrors(['permission_ids.0']);

        $this->assertFalse($role->fresh()->hasPermissionTo('administrators-manage'));
    }

    /**
     * The legitimate case still works: granting a permission the session does hold.
     */
    public function test_admin_can_grant_a_permission_their_session_holds(): void
    {
        $this->actingAdmin(['roles-view', 'roles-manage', 'users-view']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $allowed = $this->permission('users-view');

        $this->postJson("/api/v1/administrator/roles/{$role->id}/sync-permissions", [
            'permission_ids' => [$allowed->id],
        ])->assertOk();

        $this->assertTrue($role->fresh()->hasPermissionTo('users-view'));
    }

    /**
     * A mixed payload is rejected wholesale — the one forbidden id poisons it, so
     * an admin cannot smuggle a permission through alongside legitimate ones.
     */
    public function test_a_partly_forbidden_payload_is_rejected(): void
    {
        $this->actingAdmin(['roles-view', 'roles-manage', 'users-view']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $allowed = $this->permission('users-view');
        $forbidden = $this->permission('administrators-manage');

        $this->postJson("/api/v1/administrator/roles/{$role->id}/sync-permissions", [
            'permission_ids' => [$allowed->id, $forbidden->id],
        ])->assertStatus(422);

        $this->assertFalse($role->fresh()->hasPermissionTo('users-view'));
    }

    /**
     * The same rule applies to handing out a *role*: assigning one carries its
     * permissions, so an admin cannot assign a role more powerful than themselves.
     */
    public function test_admin_cannot_assign_a_role_carrying_permissions_they_lack(): void
    {
        $this->actingAdmin(['administrators-view', 'administrators-manage']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $role->givePermissionTo($this->permission('users-manage'));

        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertStatus(422);

        $this->assertFalse($target->fresh()->hasRole($role));
    }

    /**
     * Assigning a role whose permissions the session covers is still allowed.
     */
    public function test_admin_can_assign_a_role_they_fully_cover(): void
    {
        $this->actingAdmin(['administrators-view', 'administrators-manage', 'users-manage']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $role->givePermissionTo($this->permission('users-manage'));

        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertOk();

        $this->assertTrue($target->fresh()->hasRole($role));
    }

    /**
     * A role with no permissions is assignable by anyone who can manage admins.
     */
    public function test_an_empty_role_is_assignable(): void
    {
        $this->actingAdmin(['administrators-view', 'administrators-manage']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertOk();
    }
}
