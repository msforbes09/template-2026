<?php

namespace Tests\Feature\Access;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\PermissionGroups\Resources\PermissionGroupResource;
use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the array shape produced by the access-control API resources.
 */
class AccessResourceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A role resource exposes its fields and loaded permissions, hiding guard_name.
     */
    public function test_role_resource_shape(): void
    {
        $role = Role::factory()->create(['name' => 'Editor', 'meta' => ['x' => 1]]);
        $role->syncPermissions([Permission::factory()->create()->id]);

        $array = RoleResource::make($role->load('permissions'))->toArray(request());

        $this->assertSame('Editor', $array['name']);
        $this->assertSame(['x' => 1], $array['meta']);
        $this->assertArrayNotHasKey('guard_name', $array);
        $this->assertCount(1, $array['permissions']);
    }

    /**
     * A null `meta` is returned as an empty array, not null.
     */
    public function test_meta_defaults_to_empty_array_when_null(): void
    {
        $role = Role::factory()->create(['meta' => null]);

        $array = RoleResource::make($role)->toArray(request());

        $this->assertSame([], $array['meta']);
    }

    /**
     * A permission group resource nests its permissions.
     */
    public function test_permission_group_resource_nests_permissions(): void
    {
        $group = PermissionGroup::factory()->create(['name' => 'Admins']);
        Permission::factory()->count(2)->create(['group_id' => $group->id]);

        $array = PermissionGroupResource::make($group->load('permissions'))->toArray(request());

        $this->assertSame('Admins', $array['name']);
        $this->assertCount(2, $array['permissions']);
    }
}
