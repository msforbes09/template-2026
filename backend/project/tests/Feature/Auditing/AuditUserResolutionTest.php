<?php

namespace Tests\Feature\Auditing;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Models\Audit as BaseAudit;
use Tests\TestCase;

/**
 * Tests that audit rows are attributed to the acting principal on BOTH auth
 * guards — an administrator and a user alike. The audit user resolver walks
 * config('audit.user.guards'); a guard missing from that list writes audits
 * with no owner.
 */
class AuditUserResolutionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Enable auditing for these tests (globally disabled by default in the suite).
     */
    protected function setUp(): void
    {
        parent::setUp();
        BaseAudit::$auditingGloballyDisabled = false;
    }

    /**
     * A change made by an authenticated user carries the user as the
     * audit owner (user_type User + their id) — user actions must not land
     * unattributed.
     */
    public function test_user_action_is_attributed(): void
    {
        $user = User::factory()->create(['gender' => 'male']);
        $this->actingAs($user, 'users');

        // A plain column, deliberately not an encrypted PII field: those land in
        // the excluded `ciphertext`, so with `audit.empty_values` false they
        // write no row at all and there would be nothing to attribute. The
        // starting value is pinned so the update is always a real change.
        $user->update(['gender' => 'female']);

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'updated',
            'auditable_type' => 'User',
            'auditable_id' => $user->id,
            'user_type' => 'User',
            'user_id' => $user->id,
        ]);
    }

    /**
     * A change made by an authenticated administrator stays attributed to the
     * admin (the pre-existing behavior — guards order must keep admins first).
     */
    public function test_administrator_action_is_attributed(): void
    {
        $admin = Administrator::factory()->create();
        $this->actingAs($admin, 'administrators');

        $user = User::factory()->create();

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'created',
            'auditable_type' => 'User',
            'auditable_id' => $user->id,
            'user_type' => 'Administrator',
            'user_id' => $admin->id,
        ]);
    }
}
