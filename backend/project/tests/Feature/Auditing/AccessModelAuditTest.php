<?php

namespace Tests\Feature\Auditing;

use App\Models\Access\Roles\Role;
use App\Models\Misc\Audits\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Models\Audit as BaseAudit;
use Tests\TestCase;

/**
 * Tests that access-control model changes are audited.
 */
class AccessModelAuditTest extends TestCase
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
     * Creating a role writes a 'created' audit for the Role subject.
     */
    public function test_role_create_is_audited(): void
    {
        $role = Role::create(['name' => 'editor', 'guard_name' => 'administrators']);

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'created',
            'auditable_type' => 'Role',
            'auditable_id' => $role->id,
        ]);
    }
}
