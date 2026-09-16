<?php

namespace Tests\Feature\FeatureFlags;

use App\Enums\PermissionEnum;
use App\Models\Administrators\Administrator;
use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The admin feature-flag endpoints (list + toggle), gated entirely by the
 * developer-access virtual ability that only is_developer administrators
 * receive at login, and the public common flag read.
 */
class FeatureFlagEndpointsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An admin acting with the given token abilities.
     */
    private function actingAsAdmin(array $abilities, bool $developer = false): Administrator
    {
        $admin = Administrator::factory()->create([
            'with_temporary_password' => false,
            'is_developer' => $developer,
        ]);

        Sanctum::actingAs($admin, $abilities, 'administrators');

        return $admin;
    }

    /**
     * The list returns every registered flag with its current state.
     */
    public function test_developer_admin_lists_flags(): void
    {
        $this->actingAsAdmin([PermissionEnum::DEVELOPER_ACCESS], developer: true);

        $this->getJson('/api/v1/administrator/feature-flags')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'maintenance_mode', 'enabled' => 0]);
    }

    /**
     * Toggling stores the override and returns the updated flag, under the one
     * developer-access gate.
     */
    public function test_developer_admin_toggles_flags(): void
    {
        $this->actingAsAdmin([PermissionEnum::DEVELOPER_ACCESS], developer: true);

        $this->putJson('/api/v1/administrator/feature-flags/maintenance_mode', ['enabled' => 1])
            ->assertOk()
            ->assertJson(['data' => ['name' => 'maintenance_mode', 'enabled' => 1]]);
        $this->assertTrue(app(FeatureFlags::class)->enabled('maintenance_mode'));

        $this->putJson('/api/v1/administrator/feature-flags/maintenance_mode', ['enabled' => 0])
            ->assertOk()
            ->assertJson(['data' => ['name' => 'maintenance_mode', 'enabled' => 0]]);
        $this->assertFalse(app(FeatureFlags::class)->enabled('maintenance_mode'));
    }

    /**
     * Without the developer-access ability the whole surface is refused — no
     * seeded permission opens it, however many the admin holds.
     */
    public function test_surface_requires_developer_access(): void
    {
        $this->actingAsAdmin([PermissionEnum::ADMINISTRATORS_MANAGE, PermissionEnum::USERS_MANAGE]);

        $this->getJson('/api/v1/administrator/feature-flags')
            ->assertForbidden()->assertJson(['error' => 'insufficient_permissions']);
        $this->putJson('/api/v1/administrator/feature-flags/maintenance_mode', ['enabled' => 0])
            ->assertForbidden()->assertJson(['error' => 'insufficient_permissions']);
    }

    /**
     * Validation: an `enabled` boolean is required and unknown flags 404.
     */
    public function test_toggle_validation(): void
    {
        $this->actingAsAdmin([PermissionEnum::DEVELOPER_ACCESS], developer: true);

        $this->putJson('/api/v1/administrator/feature-flags/maintenance_mode', [])
            ->assertStatus(422)->assertJsonValidationErrors('enabled');

        $this->putJson('/api/v1/administrator/feature-flags/unknown_flag', ['enabled' => 1])
            ->assertNotFound();
    }

    /**
     * A developer admin's login token carries the developer-access virtual
     * ability; it is never a seeded permission, so it can never be granted
     * through roles.
     */
    public function test_developer_login_token_carries_virtual_ability(): void
    {
        Administrator::factory()->create([
            'email' => 'dev@admin.test', 'password' => 'secret-password',
            'is_active' => true, 'with_temporary_password' => false, 'is_developer' => true,
        ]);

        $token = $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'dev@admin.test', 'password' => 'secret-password',
        ])->assertOk()->json('token');

        $this->getJson('/api/v1/administrator/profile', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonFragment(['permissions' => [PermissionEnum::DEVELOPER_ACCESS]]);

        $this->assertDatabaseMissing('permissions', ['name' => PermissionEnum::DEVELOPER_ACCESS]);
    }

    /**
     * The public common endpoint returns the flat flag map, and stays up
     * during maintenance.
     */
    public function test_common_endpoint_returns_flag_map(): void
    {
        app(FeatureFlags::class)->set('maintenance_mode', true);

        $this->getJson('/api/v1/common/feature-flags')
            ->assertOk()
            ->assertJson([
                'data' => [
                    'maintenance_mode' => 1,
                ],
            ]);
    }
}
