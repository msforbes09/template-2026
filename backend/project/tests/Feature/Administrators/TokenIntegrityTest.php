<?php

namespace Tests\Feature\Administrators;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A bearer token must not outlive the authority it was issued with.
 */
class TokenIntegrityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * FINDING 16 — token abilities are snapshotted at login and never refreshed, so
     * a demoted admin kept the permissions they had when they logged in.
     *
     * This is load-bearing beyond its severity: `GrantablePermissionRule` decides what
     * an admin may hand out from their *token abilities*. A stale token therefore means
     * a demoted admin can still grant permissions they no longer hold.
     */
    public function test_changing_an_admins_roles_revokes_their_existing_tokens(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $role = Role::factory()->create(['guard_name' => Administrator::AUTH_GUARD]);
        $admin->assignRole($role);

        $admin->authenticate();
        $this->assertSame(1, $admin->tokens()->count());

        $admin->syncRolesAndAudit([]);

        $this->assertSame(0, $admin->fresh()->tokens()->count(), 'A role change must invalidate live sessions.');
    }

    /**
     * FINDING 10 — the sliding inactivity window had no absolute ceiling, so a stolen
     * token could be refreshed indefinitely simply by using it.
     */
    public function test_a_token_past_its_absolute_lifetime_is_rejected(): void
    {
        // A real bearer token, not Sanctum::actingAs — that injects a TransientToken,
        // which the refresh middleware skips, so the ceiling would never be exercised.
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $token = $admin->authenticate();

        // Keep the token continuously "active", well past the 8-hour ceiling. The
        // sliding window alone would happily carry it forever — which is precisely what
        // a thief in possession of one does.
        foreach (range(1, 9) as $ignored) {
            $this->travel(50)->minutes();
            $this->withToken($token)->getJson('/api/v1/administrator/profile')->assertOk();
        }

        // 450 minutes of unbroken activity: still inside the ceiling.
        $this->assertSame(1, $admin->tokens()->count());

        // The request that crosses 480 minutes is refused, and the token is destroyed
        // rather than merely rejected.
        $this->travel(50)->minutes();

        $this->withToken($token)->getJson('/api/v1/administrator/profile')->assertStatus(401);

        $this->assertSame(0, $admin->tokens()->count(), 'The expired token must be destroyed, not just refused.');
    }

    /**
     * A token comfortably inside the absolute ceiling still works.
     */
    public function test_a_token_within_its_absolute_lifetime_still_works(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $token = $admin->authenticate();

        $this->travel(30)->minutes();

        $this->withToken($token)->getJson('/api/v1/administrator/profile')->assertOk();
    }
}
