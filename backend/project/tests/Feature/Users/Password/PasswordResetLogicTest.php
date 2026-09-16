<?php

namespace Tests\Feature\Users\Password;

use App\Enums\AuthEventEnum;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\PasswordUnchangedException;
use App\Mail\Users\PasswordResetNoAccountMail;
use App\Mail\Users\PasswordResetOtpMail;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for the password-reset model logic.
 */
class PasswordResetLogicTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user with a password.
     */
    private function user(): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
            'registration_method' => 'website',
        ]);
    }

    /**
     * Forgot-password for a resettable account issues a reset OTP + code mail and logs the attempt.
     */
    public function test_forgot_for_resettable_account_sends_reset_code(): void
    {
        Mail::fake();
        $this->user();

        $result = User::sendPasswordResetOtp('user@example.com');

        $this->assertNotEmpty($result->resendToken);
        $this->assertDatabaseHas('otps', ['type' => 'user_password_reset', 'identifier' => 'user@example.com']);
        // The reset OTP belongs to the account being reset (attributes its delivery log).
        $this->assertTrue($result->otpable?->is(User::whereHashed('email', 'user@example.com')->firstOrFail()));
        Mail::assertSent(PasswordResetOtpMail::class);
        $this->assertNotNull(AuthAttempt::query()->where('event', AuthEventEnum::PASSWORD_RESET_REQUESTED->value)->first());
    }

    /**
     * Forgot-password for a non-account sends the "no account" notice (never a code).
     */
    public function test_forgot_for_non_account_sends_no_account_notice(): void
    {
        Mail::fake();

        User::sendPasswordResetOtp('nobody@example.com');

        $this->assertDatabaseHas('otps', ['type' => 'user_password_reset_no_account', 'identifier' => 'nobody@example.com']);
        Mail::assertSent(PasswordResetNoAccountMail::class);
        Mail::assertNotSent(PasswordResetOtpMail::class);
    }

    /**
     * A valid OTP resets the password, revokes tokens, and returns a fresh token.
     */
    public function test_reset_with_valid_otp_changes_password(): void
    {
        Mail::fake();
        $user = $this->user();
        User::sendPasswordResetOtp('user@example.com');
        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $token = User::resetPasswordWithOtp('user@example.com', $pin, 'BrandNew@456');

        $this->assertNotEmpty($token);
        $this->assertTrue(Hash::check('BrandNew@456', $user->fresh()->getAttributes()['password']));
    }

    /**
     * Resetting to the current password is rejected.
     */
    public function test_reset_to_same_password_is_rejected(): void
    {
        Mail::fake();
        $this->user();
        User::sendPasswordResetOtp('user@example.com');
        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $this->expectException(PasswordUnchangedException::class);
        User::resetPasswordWithOtp('user@example.com', $pin, 'Secret@123');
    }

    /**
     * A wrong OTP is rejected.
     */
    public function test_reset_with_wrong_otp_is_rejected(): void
    {
        Mail::fake();
        $this->user();
        User::sendPasswordResetOtp('user@example.com');

        $this->expectException(InvalidOtpException::class);
        User::resetPasswordWithOtp('user@example.com', '000000', 'BrandNew@456');
    }
}
