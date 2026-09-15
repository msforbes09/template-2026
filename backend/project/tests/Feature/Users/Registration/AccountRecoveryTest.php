<?php

namespace Tests\Feature\Users\Registration;

use App\Enums\UserStatusEnum;
use App\Exceptions\InvalidOtpException;
use App\Mail\Users\AccountRecoveryOtpMail;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Account recovery: re-registering an identifier that belongs to a soft-deleted
 * website account RESTORES that account (same row, history, type, status — even a
 * live suspension) with the newly chosen password, instead of minting a fresh one.
 * Outwardly the flow is indistinguishable from a normal registration.
 */
class AccountRecoveryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A soft-deleted website account for the given email.
     */
    private function deletedAccount(string $email, array $extra = []): User
    {
        $user = User::create([
            'email' => $email, 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'OldSecret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::COMPLETED->value,
            'registration_method' => 'website', 'authentication_method' => 'website', 'is_active' => true,
            'profile_completed_at' => now(), ...$extra,
        ]);
        $user->delete();

        return $user;
    }

    /**
     * Start a registration and capture the PIN from the given mailable class.
     */
    private function startAndCapturePin(string $email, string $mailable): string
    {
        Mail::fake();
        User::startRegistration(['email' => $email, 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp']);

        $pin = null;
        Mail::assertSent($mailable, function ($mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        return $pin;
    }

    /**
     * Re-registering a deleted account's email issues a recovery OTP and, on
     * verification, restores the same row with the new password.
     */
    public function test_recovers_the_deleted_account(): void
    {
        $user = $this->deletedAccount('user@example.com');

        $pin = $this->startAndCapturePin('user@example.com', AccountRecoveryOtpMail::class);
        $token = User::completeRegistration('user@example.com', $pin, 'NewSecret@123');

        $this->assertNotEmpty($token);
        $this->assertSame(1, User::withTrashed()->count()); // restored, not re-created

        $fresh = $user->fresh();
        $this->assertNull($fresh->deleted_at);
        $this->assertSame(UserStatusEnum::COMPLETED->value, $fresh->status);
        $this->assertNotNull($fresh->profile_completed_at);
        $this->assertTrue(password_verify('NewSecret@123', $fresh->password));
    }

    /**
     * A wrong PIN recovers nothing.
     */
    public function test_wrong_pin_recovers_nothing(): void
    {
        $this->deletedAccount('user@example.com');
        $this->startAndCapturePin('user@example.com', AccountRecoveryOtpMail::class);

        $this->expectException(InvalidOtpException::class);

        try {
            User::completeRegistration('user@example.com', '000000', 'NewSecret@123');
        } finally {
            $this->assertSame(0, User::count()); // still trashed
        }
    }

    /**
     * Recovery is bounded to a window after deletion: a long-deleted account
     * (past the window) is NOT auto-recovered on re-registration — the identifier
     * may have been recycled — so the flow issues a fresh registration OTP and
     * creates a new account instead of handing over the old one. (F2)
     */
    public function test_recovery_is_bounded_to_a_window(): void
    {
        $window = (int) config('users.recovery_window_days');
        $user = $this->deletedAccount('stale@example.com');
        $user->forceFill(['deleted_at' => now()->subDays($window + 1)])->saveQuietly();

        // Past the window => a fresh registration OTP, not a recovery OTP.
        $pin = $this->startAndCapturePin('stale@example.com', UserRegistrationOtpMail::class);
        User::completeRegistration('stale@example.com', $pin, 'NewSecret@123');

        // A fresh live row was created; the old trashed row was not restored.
        $this->assertSame(1, User::count());
        $this->assertNotNull($user->fresh()->deleted_at);
    }

    /**
     * Recovery clears any stale 2FA handshake state, so a token captured before
     * deletion cannot complete a 2FA login against the recovered account. (F2)
     */
    public function test_recovery_clears_two_factor_state(): void
    {
        $user = $this->deletedAccount('twofa@example.com');
        $user->forceFill(['auth_token' => hash('sha256', 'stale-handle')])->saveQuietly();

        $pin = $this->startAndCapturePin('twofa@example.com', AccountRecoveryOtpMail::class);
        User::completeRegistration('twofa@example.com', $pin, 'NewSecret@123');

        $this->assertNull($user->fresh()->auth_token);
    }

    /**
     * A trashed non-website account is NOT recovered — the website flow issues a
     * normal registration OTP and creates a fresh website account.
     */
    public function test_trashed_non_website_account_not_recovered(): void
    {
        $external = User::factory()->create(['email' => 'external@example.com', 'registration_method' => 'external']);
        $external->delete();

        $pin = $this->startAndCapturePin('external@example.com', UserRegistrationOtpMail::class);
        $this->assertNotNull($pin);
    }
}
