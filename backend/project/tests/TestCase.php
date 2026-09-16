<?php

namespace Tests;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;
use OwenIt\Auditing\Models\Audit;

/**
 * Base test case for the application.
 */
abstract class TestCase extends BaseTestCase
{
    /**
     * Disable auditing by default so ordinary tests emit no audit rows; audit
     * tests opt in by re-enabling. (The package registers its observer at model
     * boot when audit.enabled is true, so we gate at run-time via this flag.)
     */
    protected function setUp(): void
    {
        parent::setUp();

        Audit::$auditingGloballyDisabled = true;

        $this->reserveSuperAdminRole();
    }

    /**
     * Park the Super Admin role on id 1, as `AccessSeeder` does in a real
     * deployment.
     *
     * The guards seal role id 1, so without this a test's first
     * `Role::factory()` would land on id 1 and be sealed as the Super Admin role —
     * an artefact of the empty test database, not of anything the test asked for.
     * Reserving it here makes factory roles start at id 2, exactly as they do in
     * production.
     */
    private function reserveSuperAdminRole(): void
    {
        if (! app()->runningUnitTests() || ! $this->app->bound('db')) {
            return;
        }

        if (! Schema::hasTable('roles')) {
            return;
        }

        Role::query()->firstOrCreate(
            ['id' => Administrator::SUPER_ADMIN_ROLE_ID],
            ['name' => 'Super Admin', 'guard_name' => Administrator::AUTH_GUARD],
        );
    }
}
