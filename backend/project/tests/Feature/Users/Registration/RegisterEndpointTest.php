<?php

namespace Tests\Feature\Users\Registration;

use App\Enums\UserStatusEnum;
use App\Mail\Users\UserAccountExistsMail;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Misc\Otps\Otp;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * End-to-end tests for the registration endpoints.
 */
class RegisterEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The happy path: register → verify → authenticated draft with a token.
     */
    public function test_full_registration_happy_path(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/user/register', [
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp',
        ])->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        $pin = null;
        Mail::assertSent(UserRegistrationOtpMail::class, function ($mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        $this->postJson('/api/v1/user/verify-registration', [
            'email' => 'user@example.com', 'otp' => $pin,
            'password' => 'Secret@123', 'password_confirmation' => 'Secret@123',
        ])->assertOk()->assertJsonStructure(['token']);

        $user = User::first();
        $this->assertSame('draft', $user->status);
        $this->assertSame('Acme Corp', $user->company_name); // captured at register, decrypts from the PII blob
    }

    /**
     * The OTP is resent through the shared common/otp/resend endpoint using the
     * resend_token returned by register — and the resent PIN completes registration.
     */
    public function test_otp_is_resent_via_the_shared_endpoint(): void
    {
        Mail::fake();

        $resendToken = $this->postJson('/api/v1/user/register', [
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp',
        ])->assertOk()->json('resend_token');

        Otp::query()->update(['updated_at' => now()->subMinutes(5)]); // clear the cooldown

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => $resendToken])
            ->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        $pin = null;
        Mail::assertSent(UserRegistrationOtpMail::class, function ($mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        $this->postJson('/api/v1/user/verify-registration', [
            'email' => 'user@example.com', 'otp' => $pin,
            'password' => 'Secret@123', 'password_confirmation' => 'Secret@123',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * Resending a registration attempt on an already-registered email delivers
     * the "account exists" notice — not the OTP — because the distinct OTP type
     * carries the branch through the shared resend endpoint.
     */
    public function test_resend_for_a_registered_email_redelivers_the_notice_not_the_otp(): void
    {
        Mail::fake();
        User::create([
            'email' => 'taken@example.com', 'first_name' => 'A', 'last_name' => 'B',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value,
        ]);

        $resendToken = $this->postJson('/api/v1/user/register', [
            'email' => 'taken@example.com', 'first_name' => 'C', 'last_name' => 'D',
            'company_name' => 'Acme Corp',
        ])->assertOk()->json('resend_token');

        Otp::query()->update(['updated_at' => now()->subMinutes(5)]); // clear the cooldown

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => $resendToken])->assertOk();

        Mail::assertSent(UserAccountExistsMail::class);
        Mail::assertNotSent(UserRegistrationOtpMail::class);
    }

    /**
     * A rapid re-registration must not leak account existence: BOTH a free and a
     * taken email hit the same OTP cooldown and return the identical 429
     * (otp_throttled) on the second call within the window.
     */
    public function test_rapid_re_registration_throttles_identically_for_both_branches(): void
    {
        Mail::fake();

        $free = ['email' => 'free@example.com', 'first_name' => 'A', 'last_name' => 'B', 'company_name' => 'Acme Corp'];
        $this->postJson('/api/v1/user/register', $free)->assertOk();
        $this->postJson('/api/v1/user/register', $free)
            ->assertStatus(429)->assertJson(['error' => 'otp_throttled']);

        User::create([
            'email' => 'taken@example.com', 'first_name' => 'X', 'last_name' => 'Y',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value,
        ]);
        $taken = ['email' => 'taken@example.com', 'first_name' => 'C', 'last_name' => 'D', 'company_name' => 'Acme Corp'];
        $this->postJson('/api/v1/user/register', $taken)->assertOk();
        $this->postJson('/api/v1/user/register', $taken)
            ->assertStatus(429)->assertJson(['error' => 'otp_throttled']);
    }
}
