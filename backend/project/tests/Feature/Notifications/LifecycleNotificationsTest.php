<?php

namespace Tests\Feature\Notifications;

use App\Enums\AuthChannelEnum;
use App\Enums\UserStatusEnum;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The existing user lifecycle events also land in the in-app notification
 * center: developer application received / approved / returned, sanctions, and
 * the login-driven welcome / welcome-back pair.
 */
class LifecycleNotificationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * First login (null last_login_at) → `welcome`.
     */
    public function test_first_login_gets_a_welcome(): void
    {
        $user = User::factory()->create(['last_login_at' => null]);

        $user->recordLogin(AuthChannelEnum::EMAIL);

        $this->assertNotNull($user->notifications()->where('type', 'welcome')->first());
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    /**
     * Completing a website registration IS the first login (it returns a bearer
     * token with last_login_at stamped), so it must greet the new user with
     * `welcome` — otherwise the notification is unreachable for this lane.
     */
    public function test_completing_registration_gets_a_welcome(): void
    {
        Mail::fake();
        User::startRegistration(['email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp']);

        $pin = null;
        Mail::assertSent(UserRegistrationOtpMail::class, function (UserRegistrationOtpMail $mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        User::completeRegistration('user@example.com', $pin, 'Secret@123');

        $user = User::first();
        $this->assertNotNull($user->notifications()->where('type', 'welcome')->first());
    }

    /**
     * Completing the profile → `profile.completed`, telling the user that
     * browsing and reviewing projects just unlocked.
     */
    public function test_completing_profile_notifies_reviews_unlocked(): void
    {
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value, 'registration_method' => 'website', 'is_active' => true,
            'company_name' => 'Acme Corp',
            'citizenship_code' => 'PH', 'region_code' => 'R1', 'province_code' => 'P1',
            'municipality_code' => 'M1', 'barangay_code' => 'B1', 'address_line_one' => '123 Rizal St.',
        ]);

        $user->completeProfile();

        $this->assertNotNull($user->notifications()->where('type', 'profile.completed')->first());
    }

    /**
     * A login after a gap beyond the threshold → `welcome.back` with the days away.
     */
    public function test_long_absence_gets_a_welcome_back(): void
    {
        config(['notifications.welcome_back_days' => 30]);
        $user = User::factory()->create(['last_login_at' => now()->subDays(45)]);

        $user->recordLogin(AuthChannelEnum::EMAIL);

        $row = $user->notifications()->where('type', 'welcome.back')->first();
        $this->assertNotNull($row);
        $this->assertSame(45, $row->data['days_away']);
    }

    /**
     * A recent login gets neither welcome.
     */
    public function test_recent_login_gets_no_welcome(): void
    {
        config(['notifications.welcome_back_days' => 30]);
        $user = User::factory()->create(['last_login_at' => now()->subDays(3)]);

        $user->recordLogin(AuthChannelEnum::EMAIL);

        $this->assertSame(0, $user->notifications()->count());
    }
}
