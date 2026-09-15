<?php

namespace Tests\Feature\Access;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Foundation tests for the access-control models, relationships, and casts.
 */
class AccessModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A permission belongs to a permission group and the group has many permissions.
     */
    public function test_permission_belongs_to_a_group(): void
    {
        $group = PermissionGroup::factory()->create();
        $permission = Permission::factory()->create(['group_id' => $group->id]);

        $this->assertTrue($permission->group->is($group));
        $this->assertTrue($group->permissions->contains($permission));
    }

    /**
     * The `meta` column is cast to an array on roles and groups.
     */
    public function test_meta_is_cast_to_array(): void
    {
        $role = Role::factory()->create(['meta' => ['color' => 'red']]);

        $this->assertSame(['color' => 'red'], $role->fresh()->meta);
    }

    /**
     * An administrator can be assigned roles via Spatie's HasRoles trait.
     */
    public function test_administrator_can_be_assigned_roles(): void
    {
        $admin = Administrator::factory()->create();
        $role = Role::factory()->create();

        $admin->syncRoles([$role->id]);

        $this->assertTrue($admin->fresh()->roles->contains($role));
    }

    /**
     * A role can be assigned permissions via Spatie's HasPermissions trait.
     */
    public function test_role_can_be_assigned_permissions(): void
    {
        $role = Role::factory()->create();
        $permission = Permission::factory()->create();

        $role->syncPermissions([$permission->id]);

        $this->assertTrue($role->fresh()->permissions->contains($permission));
    }

    /**
     * Soft-deleted roles are excluded from default queries.
     */
    public function test_roles_soft_delete(): void
    {
        $role = Role::factory()->create();
        $role->delete();

        $this->assertNull(Role::find($role->id));
        $this->assertNotNull(Role::withTrashed()->find($role->id));
    }
}
