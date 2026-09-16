<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Administrator password expiry: the profile announces when the password expires,
 * an expired password can be postponed a limited number of times, and once the
 * postponements are used up the console is gated until it is changed.
 */
class PasswordExpiryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An administrator with a real (non-temporary) password set the given number
     * of days ago.
     */
    private function administrator(int $changedDaysAgo = 0, int $waives = 0): Administrator
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@456', 'with_temporary_password' => false]);
        $administrator->forceFill([
            'password_changed_at' => now()->subDays($changedDaysAgo),
            'password_expiry_waives' => $waives,
        ])->save();

        return $administrator;
    }

    /**
     * Define a protected route guarded by the gate for the test.
     */
    private function defineProtectedRoute(): void
    {
        Route::middleware(['auth:administrators', 'password.changed'])
            ->get('/__protected', fn () => response()->json(['ok' => true]));
    }

    /**
     * The profile carries the expiry date, derived from the last change and the
     * configured lifetime, plus how many postponements remain.
     */
    public function test_profile_exposes_password_expiry(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $administrator = $this->administrator(changedDaysAgo: 10, waives: 1);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->getJson('/api/v1/administrator/profile')
            ->assertOk()
            ->assertJsonPath('data.password_expires_at', now()->addDays(80)->format('Y-m-d H:i:s'))
            ->assertJsonPath('data.is_password_expired', 0)
            ->assertJsonPath('data.password_expiry_waives_remaining', 2);
    }

    /**
     * Expired with every postponement used up: the console is gated with a
     * distinct error code so the frontend can word the forced change correctly.
     */
    public function test_expired_password_with_no_waives_left_is_gated(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $this->defineProtectedRoute();
        Sanctum::actingAs($this->administrator(changedDaysAgo: 91, waives: 3), guard: 'administrators');

        $this->getJson('/__protected')->assertStatus(403)->assertJsonPath('error', 'password_expired');
    }

    /**
     * Expired but with postponements left: the console stays open.
     */
    public function test_expired_password_with_waives_left_passes_the_gate(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $this->defineProtectedRoute();
        Sanctum::actingAs($this->administrator(changedDaysAgo: 91, waives: 2), guard: 'administrators');

        $this->getJson('/__protected')->assertOk();
    }

    /**
     * With expiry disabled nothing is ever expired, however old the password.
     */
    public function test_zero_days_disables_expiry(): void
    {
        config(['auth.administrators.password_expiry_days' => 0]);
        $this->defineProtectedRoute();
        Sanctum::actingAs($this->administrator(changedDaysAgo: 1000, waives: 3), guard: 'administrators');

        $this->getJson('/__protected')->assertOk();
        $this->getJson('/api/v1/administrator/profile')
            ->assertJsonPath('data.password_expires_at', null)
            ->assertJsonPath('data.is_password_expired', 0);
    }

    /**
     * Postponing an expired password uses one waive and answers with the
     * refreshed profile.
     */
    public function test_waiving_an_expired_password_uses_one_waive(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $administrator = $this->administrator(changedDaysAgo: 91, waives: 0);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/password/waive-expiry')
            ->assertOk()
            ->assertJsonPath('data.password_expiry_waives_remaining', 2)
            ->assertJsonPath('data.is_password_expired', 0)
            ->assertJsonPath('data.password_expires_at', now()->addDays(7)->format('Y-m-d H:i:s'));

        $this->assertSame(1, $administrator->fresh()->password_expiry_waives);
    }

    /**
     * A postponement buys a fixed number of days, after which the password is
     * expired again; once the last one runs out the console is gated. The policy
     * is enforced by the clock, not by the client's cooperation.
     */
    public function test_postponements_run_out_and_the_gate_closes(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 1, 'auth.administrators.password_expiry_waive_days' => 7]);
        $this->defineProtectedRoute();
        $administrator = $this->administrator(changedDaysAgo: 91, waives: 0);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/password/waive-expiry')->assertOk();
        $this->getJson('/__protected')->assertOk();

        $this->travel(8)->days();
        $this->assertTrue($administrator->fresh()->isPasswordExpired());
        $this->getJson('/__protected')->assertStatus(403)->assertJsonPath('error', 'password_expired');
        $this->postJson('/api/v1/administrator/password/waive-expiry')->assertStatus(400);
    }

    /**
     * Once the postponements are used up the endpoint refuses.
     */
    public function test_waiving_with_no_waives_left_is_refused(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $administrator = $this->administrator(changedDaysAgo: 91, waives: 3);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/password/waive-expiry')
            ->assertStatus(400)
            ->assertJsonPath('error', 'password_expiry_waive_unavailable');

        $this->assertSame(3, $administrator->fresh()->password_expiry_waives);
    }

    /**
     * A password that has not expired has nothing to postpone.
     */
    public function test_waiving_an_unexpired_password_is_refused(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        Sanctum::actingAs($this->administrator(changedDaysAgo: 10), guard: 'administrators');

        $this->postJson('/api/v1/administrator/password/waive-expiry')
            ->assertStatus(400)
            ->assertJsonPath('error', 'password_expiry_waive_unavailable');
    }

    /**
     * Changing the password starts a fresh lifetime: the waive counter resets.
     */
    public function test_changing_the_password_resets_the_waives(): void
    {
        config(['auth.administrators.password_expiry_days' => 90, 'auth.administrators.password_expiry_max_waives' => 3]);
        $administrator = $this->administrator(changedDaysAgo: 91, waives: 2);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertOk();

        $fresh = $administrator->fresh();
        $this->assertSame(0, $fresh->password_expiry_waives);
        $this->assertNull($fresh->password_expiry_waived_until);
        $this->assertFalse($fresh->isPasswordExpired());
    }
}
