<?php

namespace Tests\Feature\Auditing;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Models\Audit as BaseAudit;
use Tests\TestCase;

/**
 * Tests that administrator changes are audited without leaking secrets.
 */
class AdministratorAuditTest extends TestCase
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
     * Creating an administrator writes a 'created' audit for that subject.
     */
    public function test_create_is_audited(): void
    {
        $admin = Administrator::factory()->create();

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'created',
            'auditable_type' => 'Administrator',
            'auditable_id' => $admin->id,
        ]);
    }

    /**
     * The audited new_values never include secret columns.
     */
    public function test_secrets_are_excluded(): void
    {
        $admin = Administrator::factory()->create();

        $newValues = (array) Audit::query()->where('auditable_id', $admin->id)->first()->new_values;

        $this->assertArrayNotHasKey('password', $newValues);
        $this->assertArrayNotHasKey('auth_token', $newValues);
        $this->assertArrayNotHasKey('trusted_device', $newValues);
    }

    /**
     * A login only stamps `last_login_at` — session bookkeeping, not an
     * accountable change — so it must leave no audit row at all. An admin signs
     * in many times a day; those rows crowd out the real changes.
     */
    public function test_login_is_not_audited(): void
    {
        config()->set('auth.administrators.two_factor.enabled', false);

        $admin = Administrator::factory()->create();
        $before = $this->auditCountFor($admin);

        Administrator::attemptTwoFactor(['email' => $admin->email, 'password' => 'password']);

        $this->assertNotNull($admin->fresh()->last_login_at, 'the login should still be stamped');
        $this->assertSame($before, $this->auditCountFor($admin));
    }

    /**
     * A real change to the account is still audited — the exclusions must not
     * silence the rows that matter.
     */
    public function test_profile_changes_are_still_audited(): void
    {
        $admin = Administrator::factory()->create();

        $admin->update(['email' => 'moved@example.test', 'is_active' => false]);

        $newValues = (array) Audit::query()
            ->where('auditable_type', 'Administrator')
            ->where('auditable_id', $admin->id)
            ->where('event', 'updated')
            ->latest('id')
            ->first()->new_values;

        $this->assertSame('moved@example.test', $newValues['email']);
        $this->assertArrayHasKey('is_active', $newValues);
    }

    /**
     * Session/token bookkeeping never reaches the trail.
     */
    public function test_session_columns_are_excluded(): void
    {
        $admin = Administrator::factory()->create();

        $admin->update(['email' => 'moved@example.test', 'last_login_at' => now(), 'auth_validated' => now()]);

        $newValues = (array) Audit::query()
            ->where('auditable_id', $admin->id)
            ->where('event', 'updated')
            ->latest('id')
            ->first()->new_values;

        $this->assertArrayNotHasKey('last_login_at', $newValues);
        $this->assertArrayNotHasKey('auth_validated', $newValues);
    }

    /**
     * Every audit row written for an administrator.
     */
    private function auditCountFor(Administrator $admin): int
    {
        return Audit::query()
            ->where('auditable_type', 'Administrator')
            ->where('auditable_id', $admin->id)
            ->count();
    }
}
