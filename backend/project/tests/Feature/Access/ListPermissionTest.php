<?php

namespace Tests\Feature\Access;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for the grouped permissions listing.
 */
class ListPermissionTest extends TestCase
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
            ['roles-view'],
            'administrators',
        );
    }

    /**
     * The endpoint returns each group with its nested permissions.
     */
    public function test_lists_groups_with_permissions(): void
    {
        $group = PermissionGroup::factory()->create();
        Permission::factory()->count(3)->create(['group_id' => $group->id]);

        $response = $this->getJson('/api/v1/administrator/permissions');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonCount(3, 'data.0.permissions');
    }

    /**
     * Groups come back alphabetically by name (permissions inside each group
     * keep their id order).
     */
    public function test_groups_are_sorted_alphabetically(): void
    {
        foreach (['users', 'access', 'notifications', 'dashboard'] as $name) {
            PermissionGroup::factory()->create(['name' => $name]);
        }

        $names = $this->getJson('/api/v1/administrator/permissions')
            ->assertOk()
            ->json('data.*.name');

        $this->assertSame(['access', 'dashboard', 'notifications', 'users'], $names);
    }
}
