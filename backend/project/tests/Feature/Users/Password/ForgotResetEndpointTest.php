<?php

namespace Tests\Feature\Users\Password;

use App\Mail\Users\PasswordResetNoAccountMail;
use App\Mail\Users\PasswordResetOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * End-to-end tests for the forgot-password / reset-password endpoints.
 */
class ForgotResetEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user with a known password.
     */
    private function user(): void
    {
        User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    /**
     * Forgot then reset: resettable account gets a code and completes the reset.
     */
    public function test_forgot_then_reset_flow(): void
    {
        Mail::fake();
        $this->user();

        $this->postJson('/api/v1/user/forgot-password', ['email' => 'user@example.com'])
            ->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $this->postJson('/api/v1/user/reset-password', [
            'email' => 'user@example.com', 'otp' => $pin,
            'new_password' => 'BrandNew@456', 'new_password_confirmation' => 'BrandNew@456',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * Forgot-password for a non-account returns the identical response but the
     * "no account" notice — never a reset code.
     */
    public function test_forgot_for_non_account_is_indistinguishable(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/user/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        Mail::assertSent(PasswordResetNoAccountMail::class);
        Mail::assertNotSent(PasswordResetOtpMail::class);
    }

    /**
     * A wrong OTP is rejected.
     */
    public function test_reset_with_wrong_otp_returns_400(): void
    {
        Mail::fake();
        $this->user();
        $this->postJson('/api/v1/user/forgot-password', ['email' => 'user@example.com'])->assertOk();

        $this->postJson('/api/v1/user/reset-password', [
            'email' => 'user@example.com', 'otp' => '000000',
            'new_password' => 'BrandNew@456', 'new_password_confirmation' => 'BrandNew@456',
        ])->assertStatus(400)->assertJson(['error' => 'invalid_otp']);
    }

    /**
     * Resetting to the current password is rejected.
     */
    public function test_reset_to_same_password_returns_400(): void
    {
        Mail::fake();
        $this->user();
        $this->postJson('/api/v1/user/forgot-password', ['email' => 'user@example.com'])->assertOk();
        $pin = null;
        Mail::assertSent(PasswordResetOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $this->postJson('/api/v1/user/reset-password', [
            'email' => 'user@example.com', 'otp' => $pin,
            'new_password' => 'Secret@123', 'new_password_confirmation' => 'Secret@123',
        ])->assertStatus(400)->assertJson(['error' => 'password_unchanged']);
    }
}
