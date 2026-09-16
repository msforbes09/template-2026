<?php

namespace Tests\Feature\Access;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for permission abilities bound to the login token.
 */
class LoginAbilitiesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A freshly issued token carries the administrator's permission names as abilities.
     */
    public function test_login_token_carries_permission_abilities(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]);
        $permission = Permission::factory()->create(['name' => 'administrators-view']);
        $role = Role::factory()->create();
        $role->syncPermissions([$permission->id]);
        $admin->syncRoles([$role->id]);

        $admin->authenticate();

        $abilities = $admin->tokens()->first()->abilities;
        $this->assertContains('administrators-view', $abilities);
        $this->assertNotContains('*', $abilities);
    }
}
