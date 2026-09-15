<?php

namespace Tests\Feature\Access;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * No de-escalation either: a sync must not let a lower-privilege admin REMOVE a
 * role/permission they could not have granted (an empty or partial array would
 * otherwise strip privileges the actor doesn't hold).
 */
class SyncRemovalGuardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Act as an admin whose session holds exactly the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingAdmin(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    /**
     * A permission row by name.
     */
    private function permission(string $name): Permission
    {
        return Permission::query()->firstOrCreate(['name' => $name, 'guard_name' => Administrator::AUTH_GUARD]);
    }

    /**
     * An admin cannot strip a role carrying a permission their own session lacks.
     */
    public function test_cannot_strip_a_role_beyond_the_actor(): void
    {
        $this->actingAdmin(['administrators-view', 'administrators-manage']);

        $target = Administrator::factory()->create();
        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $role->givePermissionTo($this->permission('roles-manage')); // actor lacks roles-manage
        $target->syncRoles([$role->id]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", ['role_ids' => []])
            ->assertStatus(422)->assertJsonValidationErrors(['role_ids']);

        $this->assertCount(1, $target->fresh()->roles);
    }

    /**
     * An admin cannot strip a permission from a role that their session lacks.
     */
    public function test_cannot_strip_a_permission_beyond_the_actor(): void
    {
        $this->actingAdmin(['roles-view', 'roles-manage']);

        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $role->givePermissionTo($this->permission('administrators-manage')); // actor lacks it

        $this->postJson("/api/v1/administrator/roles/{$role->id}/sync-permissions", ['permission_ids' => []])
            ->assertStatus(422)->assertJsonValidationErrors(['permission_ids']);

        $this->assertTrue($role->fresh()->hasPermissionTo('administrators-manage'));
    }

    /**
     * Stripping a role/permission the actor DOES hold still works.
     */
    public function test_can_strip_within_the_actors_grant(): void
    {
        $this->actingAdmin(['administrators-view', 'administrators-manage']);

        $target = Administrator::factory()->create();
        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $role->givePermissionTo($this->permission('administrators-view'));
        $target->syncRoles([$role->id]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", ['role_ids' => []])
            ->assertStatus(200);

        $this->assertCount(0, $target->fresh()->roles);
    }
}
