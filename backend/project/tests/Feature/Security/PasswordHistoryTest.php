<?php

namespace Tests\Feature\Security;

use App\Mail\Users\PasswordResetOtpMail;
use App\Models\Administrators\Administrator;
use App\Models\Misc\PasswordHistories\PasswordHistory;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Password history: every password set is recorded, bounded to the configured
 * limit, and recent passwords cannot be reused.
 */
class PasswordHistoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user with a known password.
     */
    private function user(): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    /**
     * Creating an account and every later password set each record one history
     * row holding the hash, for both guards.
     */
    public function test_setting_a_password_records_a_history_row(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'First@123']);
        $user = $this->user();

        $this->assertSame(1, $administrator->passwordHistories()->count());
        $this->assertSame(1, $user->passwordHistories()->count());

        $administrator->update(['password' => 'Second@456']);

        $this->assertSame(2, $administrator->passwordHistories()->count());
        $latest = $administrator->passwordHistories()->latest('id')->first();
        $this->assertInstanceOf(PasswordHistory::class, $latest);
        $this->assertTrue(Hash::check('Second@456', $latest->password));
    }

    /**
     * Only the newest `history_limit` hashes are kept; older rows are pruned on write.
     */
    public function test_history_is_pruned_to_the_configured_limit(): void
    {
        config(['auth.password_policy.history_limit' => 3]);
        $administrator = Administrator::factory()->create(['password' => 'First@123']);

        foreach (['Second@456', 'Third@789', 'Fourth@012', 'Fifth@345'] as $password) {
            $administrator->update(['password' => $password]);
        }

        $this->assertSame(3, $administrator->passwordHistories()->count());
        $kept = $administrator->passwordHistories()->orderBy('id')->pluck('password');
        $this->assertTrue(Hash::check('Third@789', $kept[0]));
        $this->assertTrue(Hash::check('Fifth@345', $kept[2]));
    }

    /**
     * An administrator may not change to a password held within the history window.
     */
    public function test_admin_change_password_rejects_a_recently_used_password(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'OldPass@123', 'with_temporary_password' => false]);
        $administrator->update(['password' => 'Current@456']);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'OldPass@123',
            'new_password_confirmation' => 'OldPass@123',
        ])->assertStatus(422)->assertJsonValidationErrors('new_password');
    }

    /**
     * A user may not change to a password held within the history window.
     */
    public function test_user_change_password_rejects_a_recently_used_password(): void
    {
        $user = $this->user();
        $user->update(['password' => 'Current@456']);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'Secret@123',
            'new_password_confirmation' => 'Secret@123',
        ])->assertStatus(422)->assertJsonValidationErrors('new_password');
    }

    /**
     * A reset via OTP is bound by the same history window.
     */
    public function test_user_reset_password_rejects_a_recently_used_password(): void
    {
        Mail::fake();
        $user = $this->user();
        $user->update(['password' => 'Current@456']);
        User::sendPasswordResetOtp('user@example.com');
        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $this->postJson('/api/v1/user/reset-password', [
            'email' => 'user@example.com', 'otp' => $pin,
            'new_password' => 'Secret@123', 'new_password_confirmation' => 'Secret@123',
        ])->assertStatus(422)->assertJsonValidationErrors('new_password');
    }

    /**
     * A voluntary administrator change inside the minimum age is refused with the
     * domain envelope and tells the caller when a change becomes possible.
     */
    public function test_admin_voluntary_change_within_min_age_is_rejected(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@456', 'with_temporary_password' => false]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertStatus(400)
            ->assertJsonPath('error', 'password_changed_too_recently')
            ->assertJsonStructure(['meta' => ['available_at']]);

        $this->assertTrue(Hash::check('Current@456', $administrator->fresh()->password));
    }

    /**
     * Once the minimum age has passed the same change goes through.
     */
    public function test_admin_change_after_min_age_is_allowed(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@456', 'with_temporary_password' => false]);
        Sanctum::actingAs($administrator, guard: 'administrators');
        $this->travel(25)->hours();

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertOk();
    }

    /**
     * The forced change of an admin-issued temporary password is never held back
     * by the minimum age: it is the path a fresh or reset account must take.
     */
    public function test_forced_temporary_password_change_ignores_min_age(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Temp@1234', 'with_temporary_password' => true]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Temp@1234',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertOk();
    }

    /**
     * A voluntary user change inside the minimum age is refused the same way.
     */
    public function test_user_change_within_min_age_is_rejected(): void
    {
        Sanctum::actingAs($this->user(), ['*'], 'users');

        $this->postJson('/api/v1/user/change-password', [
            'current_password' => 'Secret@123',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertStatus(400)->assertJsonPath('error', 'password_changed_too_recently');
    }

    /**
     * A reset via OTP is exempt from the minimum age: it is the recovery path.
     */
    public function test_user_reset_ignores_min_age(): void
    {
        Mail::fake();
        $this->user();
        User::sendPasswordResetOtp('user@example.com');
        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $this->postJson('/api/v1/user/reset-password', [
            'email' => 'user@example.com', 'otp' => $pin,
            'new_password' => 'BrandNew@789', 'new_password_confirmation' => 'BrandNew@789',
        ])->assertOk();
    }

    /**
     * Setting either limit to 0 disables that check.
     */
    public function test_zero_limits_disable_both_checks(): void
    {
        config(['auth.password_policy.history_limit' => 0, 'auth.password_policy.min_age_hours' => 0]);
        $administrator = Administrator::factory()->create(['password' => 'Current@456', 'with_temporary_password' => false]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@456',
            'new_password' => 'BrandNew@789',
            'new_password_confirmation' => 'BrandNew@789',
        ])->assertOk();

        $this->assertSame(0, $administrator->passwordHistories()->count());
    }
}
