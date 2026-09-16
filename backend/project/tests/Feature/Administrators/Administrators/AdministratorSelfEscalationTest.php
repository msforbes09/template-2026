<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Guards on the administrator-management endpoints: an admin may not manage their
 * own account through them, may not touch the super administrator, and may not
 * hand out the Super Admin role unless they already hold it.
 */
class AdministratorSelfEscalationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Act as an admin holding the given abilities and return it.
     *
     * @param  list<string>  $abilities
     */
    private function actingAdmin(array $abilities = ['administrators-manage', 'administrators-view']): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, $abilities, 'administrators');

        return $admin;
    }

    /**
     * The Super Admin role — identified by its id, which is what confers every
     * permission and what the guards key on.
     */
    private function superAdminRole(): Role
    {
        return Role::query()->findOrFail(Administrator::SUPER_ADMIN_ROLE_ID);
    }

    /**
     * The Super Admin role cannot be renamed. A name-based super-admin check would
     * be defeated by exactly this, so the role must be sealed.
     */
    public function test_super_admin_role_cannot_be_renamed(): void
    {
        $role = $this->superAdminRole();
        $this->actingAdmin(['roles-manage', 'roles-view']);

        $this->putJson("/api/v1/administrator/roles/{$role->id}", ['name' => 'Harmless Role'])
            ->assertStatus(403)
            ->assertJson(['error' => 'super_admin_role_protected']);

        $this->assertSame('Super Admin', $role->fresh()->name);
    }

    /**
     * The Super Admin role's permissions cannot be changed — stripping them would
     * silently disarm whoever holds it.
     */
    public function test_super_admin_role_permissions_cannot_be_synced(): void
    {
        $role = $this->superAdminRole();
        $this->actingAdmin(['roles-manage', 'roles-view']);

        $this->postJson("/api/v1/administrator/roles/{$role->id}/sync-permissions", ['permission_ids' => []])
            ->assertStatus(403);
    }

    /**
     * The Super Admin role cannot be deleted.
     */
    public function test_super_admin_role_cannot_be_deleted(): void
    {
        $role = $this->superAdminRole();
        $this->actingAdmin(['roles-manage', 'roles-view']);

        $this->deleteJson("/api/v1/administrator/roles/{$role->id}")->assertStatus(403);

        $this->assertNotNull($role->fresh());
    }

    /**
     * The seal is specific to the Super Admin role — ordinary roles stay editable.
     */
    public function test_an_ordinary_role_is_still_editable(): void
    {
        $this->superAdminRole();
        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $this->actingAdmin(['roles-manage', 'roles-view']);

        $this->putJson("/api/v1/administrator/roles/{$role->id}", ['name' => 'Renamed Role'])
            ->assertOk();
    }

    /**
     * The core escalation: an admin syncs roles onto their own id and grants
     * themselves Super Admin, taking over the system.
     */
    public function test_admin_cannot_sync_roles_on_themselves(): void
    {
        $admin = $this->actingAdmin();
        $role = $this->superAdminRole();

        $this->postJson("/api/v1/administrator/administrators/{$admin->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertStatus(403);

        $this->assertFalse($admin->fresh()->hasRole('Super Admin'));
    }

    /**
     * An admin cannot update their own record through the management endpoint —
     * notably their own email, which would enable a password-reset takeover.
     */
    public function test_admin_cannot_update_themselves(): void
    {
        $admin = $this->actingAdmin();

        $this->putJson("/api/v1/administrator/administrators/{$admin->id}", [
            'first_name' => $admin->first_name,
            'last_name' => $admin->last_name,
            'email' => 'attacker@example.com',
        ])->assertStatus(403);
    }

    /**
     * An admin cannot deactivate themselves.
     */
    public function test_admin_cannot_toggle_their_own_active_status(): void
    {
        $admin = $this->actingAdmin();

        $this->postJson("/api/v1/administrator/administrators/{$admin->id}/toggle-active-status")
            ->assertStatus(403);
    }

    /**
     * An admin cannot reset their own password through the management endpoint.
     */
    public function test_admin_cannot_reset_their_own_password(): void
    {
        $admin = $this->actingAdmin();

        $this->postJson("/api/v1/administrator/administrators/{$admin->id}/reset-password")
            ->assertStatus(403);
    }

    /**
     * An admin cannot delete themselves.
     */
    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = $this->actingAdmin();

        $this->deleteJson("/api/v1/administrator/administrators/{$admin->id}")
            ->assertStatus(403);
    }

    /**
     * The super administrator is not manageable through the API — no email swap,
     * no password reset, no role change, by anyone.
     */
    public function test_super_administrator_cannot_be_managed(): void
    {
        $superAdmin = Administrator::factory()->create(['with_temporary_password' => false]);
        $superAdmin->assignRole($this->superAdminRole());

        $this->actingAdmin();

        $this->putJson("/api/v1/administrator/administrators/{$superAdmin->id}", [
            'first_name' => 'Taken',
            'last_name' => 'Over',
            'email' => 'attacker@example.com',
        ])->assertStatus(403);

        $this->postJson("/api/v1/administrator/administrators/{$superAdmin->id}/reset-password")
            ->assertStatus(403);

        $this->postJson("/api/v1/administrator/administrators/{$superAdmin->id}/toggle-active-status")
            ->assertStatus(403);

        $this->deleteJson("/api/v1/administrator/administrators/{$superAdmin->id}")
            ->assertStatus(403);

        $this->assertNotSame('attacker@example.com', $superAdmin->fresh()->email);
    }

    /**
     * A super admin may manage a peer super admin.
     *
     * The seal exists to stop a *lesser* admin hijacking a super admin — swapping
     * its email, then resetting a password onto an address they control. It buys
     * nothing against a peer, who already holds every permission. Sealing peers out
     * would make the role a one-way door: grantable over the API but never
     * revocable, so a mistaken promotion could only be undone in the database.
     */
    public function test_a_super_admin_can_manage_a_peer_super_admin(): void
    {
        $role = $this->superAdminRole();

        $peer = Administrator::factory()->create(['with_temporary_password' => false]);
        $peer->assignRole($role);

        $acting = Administrator::factory()->create(['with_temporary_password' => false]);
        $acting->assignRole($role);
        Sanctum::actingAs($acting, ['administrators-manage', 'administrators-view'], 'administrators');

        // Demote the peer — the escape hatch that must exist.
        $this->postJson("/api/v1/administrator/administrators/{$peer->id}/sync-roles", [
            'role_ids' => [],
        ])->assertOk();

        $this->assertFalse($peer->fresh()->isSuperAdmin());
    }

    /**
     * A super admin still cannot manage their *own* account through these
     * endpoints — the self-guard is absolute, for everyone.
     */
    public function test_a_super_admin_still_cannot_manage_themselves(): void
    {
        $acting = Administrator::factory()->create(['with_temporary_password' => false]);
        $acting->assignRole($this->superAdminRole());
        Sanctum::actingAs($acting, ['administrators-manage', 'administrators-view'], 'administrators');

        $this->deleteJson("/api/v1/administrator/administrators/{$acting->id}")
            ->assertStatus(403)
            ->assertJson(['error' => 'self_management_forbidden']);
    }

    /**
     * An admin who does not hold Super Admin cannot hand it to anyone else —
     * otherwise the self-guard is trivially sidestepped via a second account.
     */
    public function test_admin_cannot_grant_the_super_admin_role_to_another_admin(): void
    {
        $this->actingAdmin();
        $role = $this->superAdminRole();
        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertStatus(422);

        $this->assertFalse($target->fresh()->hasRole('Super Admin'));
    }

    /**
     * A super admin may still promote another admin — the role is not sealed off
     * entirely, or a prod without id 1 could never mint one again.
     */
    public function test_a_super_admin_can_grant_the_super_admin_role(): void
    {
        $role = $this->superAdminRole();

        $acting = Administrator::factory()->create(['with_temporary_password' => false]);
        $acting->assignRole($role);
        Sanctum::actingAs($acting, ['administrators-manage', 'administrators-view'], 'administrators');

        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/sync-roles", [
            'role_ids' => [$role->id],
        ])->assertOk();

        $this->assertTrue($target->fresh()->hasRole('Super Admin'));
    }

    /**
     * The guards must not break the legitimate case: managing a different,
     * ordinary administrator still works.
     */
    public function test_managing_another_ordinary_admin_still_works(): void
    {
        $this->actingAdmin();
        $target = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->postJson("/api/v1/administrator/administrators/{$target->id}/toggle-active-status")
            ->assertOk();
    }
}
