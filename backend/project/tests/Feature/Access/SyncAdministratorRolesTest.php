<?php

namespace Tests\Feature\Access;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for syncing an administrator's roles.
 */
class SyncAdministratorRolesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate a usable actor administrator before each test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(
            Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]),
            ['administrators-view', 'administrators-manage'],
            'administrators',
        );
    }

    /**
     * Syncing replaces the administrator's roles with the given set.
     */
    public function test_sync_roles_assigns_and_returns_roles(): void
    {
        $target = Administrator::factory()->create();
        $roles = Role::factory()->count(2)->create();

        $response = $this->postJson(
            "/api/v1/administrator/administrators/{$target->id}/sync-roles",
            ['role_ids' => $roles->pluck('id')->all()],
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $target->id);
        $response->assertJsonCount(2, 'data.roles');
        $this->assertCount(2, $target->fresh()->roles);
    }

    /**
     * Re-syncing with a different set replaces, not appends.
     */
    public function test_sync_roles_replaces_existing(): void
    {
        $target = Administrator::factory()->create();
        $first = Role::factory()->create();
        $second = Role::factory()->create();
        $target->syncRoles([$first->id]);

        $this->postJson(
            "/api/v1/administrator/administrators/{$target->id}/sync-roles",
            ['role_ids' => [$second->id]],
        )->assertStatus(200);

        $roles = $target->fresh()->roles;
        $this->assertCount(1, $roles);
        $this->assertTrue($roles->contains($second));
    }

    /**
     * Unknown role ids are rejected with a validation error.
     */
    public function test_sync_roles_rejects_unknown_ids(): void
    {
        $target = Administrator::factory()->create();

        $this->postJson(
            "/api/v1/administrator/administrators/{$target->id}/sync-roles",
            ['role_ids' => [999999]],
        )->assertStatus(422);
    }
}
