<?php

namespace Tests\Feature\FeatureFlags;

use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Maintenance mode: while the `maintenance_mode` flag is on, the user
 * surface, its public/common satellites, and the partner gateway answer 503
 * `service_unavailable`; the admin surface is reserved for `is_developer`
 * administrators (non-developers cannot even authenticate), with logout as
 * the sole exception. Untouched public reads stay up.
 */
class MaintenanceModeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Switch maintenance mode on.
     */
    private function enableMaintenance(): void
    {
        app(FeatureFlags::class)->set('maintenance_mode', true);
    }

    /**
     * Every user endpoint is down — pre-auth and authenticated alike.
     */
    public function test_user_endpoints_are_down(): void
    {
        $this->enableMaintenance();

        $this->postJson('/api/v1/user/authenticate', ['email' => 'x@y.test', 'password' => 'nope'])
            ->assertStatus(503)->assertJson(['error' => 'service_unavailable']);

        Sanctum::actingAs(User::factory()->create(), ['*'], 'users');
        $this->getJson('/api/v1/user/profile')
            ->assertStatus(503)->assertJson(['error' => 'service_unavailable']);
    }

    /**
     * The gated common endpoints are down; the untouched public reads stay up.
     */
    public function test_common_blast_radius(): void
    {
        $this->enableMaintenance();

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => 'x'])->assertStatus(503);

        $this->getJson('/api/v1/common/contents')->assertOk();
        $this->getJson('/api/v1/common/countries')->assertOk();
    }

    /**
     * An authenticated non-developer admin is refused everywhere but logout;
     * a developer admin keeps full access.
     */
    public function test_admin_surface_requires_developer(): void
    {
        $this->enableMaintenance();

        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, ['*'], 'administrators');
        $this->getJson('/api/v1/administrator/profile')
            ->assertStatus(503)->assertJson(['error' => 'service_unavailable']);
        $this->postJson('/api/v1/administrator/logout')->assertOk();

        $developer = Administrator::factory()->create(['with_temporary_password' => false, 'is_developer' => true]);
        Sanctum::actingAs($developer, ['*'], 'administrators');
        $this->getJson('/api/v1/administrator/profile')->assertOk();
    }

    /**
     * A non-developer admin cannot authenticate at all during maintenance —
     * refused after credential verification, before any OTP is issued.
     */
    public function test_non_developer_admin_cannot_authenticate(): void
    {
        Mail::fake();
        config(['auth.administrators.two_factor.enabled' => true]);
        $this->enableMaintenance();

        Administrator::factory()->create([
            'email' => 'ada@admin.test', 'password' => 'secret-password',
            'is_active' => true, 'with_temporary_password' => false,
        ]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test', 'password' => 'secret-password',
        ])->assertStatus(503)->assertJson(['error' => 'service_unavailable']);

        Mail::assertNothingSent();
    }

    /**
     * A developer admin authenticates normally during maintenance.
     */
    public function test_developer_admin_authenticates(): void
    {
        $this->enableMaintenance();

        Administrator::factory()->create([
            'email' => 'dev@admin.test', 'password' => 'secret-password',
            'is_active' => true, 'with_temporary_password' => false, 'is_developer' => true,
        ]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'dev@admin.test', 'password' => 'secret-password',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * With the flag off (the default) nothing is gated.
     */
    public function test_everything_reachable_while_off(): void
    {
        $this->getJson('/api/v1/common/countries')->assertOk();

        Sanctum::actingAs(Administrator::factory()->create(['with_temporary_password' => false]), ['*'], 'administrators');
        $this->getJson('/api/v1/administrator/profile')->assertOk();
    }
}
