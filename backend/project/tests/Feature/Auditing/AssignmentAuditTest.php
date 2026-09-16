<?php

namespace Tests\Feature\Auditing;

use App\Models\Access\Permissions\Permission;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Models\Audit as BaseAudit;
use Tests\TestCase;

/**
 * Tests that role/permission assignments (pivot syncs) are audited as custom events.
 */
class AssignmentAuditTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Enable auditing for these tests.
     */
    protected function setUp(): void
    {
        parent::setUp();
        BaseAudit::$auditingGloballyDisabled = false;
    }

    /**
     * Syncing an administrator's roles records a 'sync' audit on the administrator.
     */
    public function test_admin_roles_sync_is_audited(): void
    {
        $admin = Administrator::factory()->create();
        $role = Role::create(['name' => 'editor', 'guard_name' => 'administrators']);

        $admin->syncRolesAndAudit([$role->id]);

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'sync',
            'auditable_type' => 'Administrator',
            'auditable_id' => $admin->id,
        ]);
    }

    /**
     * Syncing a role's permissions records a 'sync' audit on the role.
     */
    public function test_role_permissions_sync_is_audited(): void
    {
        $role = Role::create(['name' => 'editor', 'guard_name' => 'administrators']);
        $permission = Permission::create(['name' => 'administrators.view', 'guard_name' => 'administrators']);

        $role->syncPermissionsAndAudit([$permission->id]);

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'sync',
            'auditable_type' => 'Role',
            'auditable_id' => $role->id,
        ]);
    }
}
