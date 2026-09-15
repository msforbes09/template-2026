<?php

namespace Tests\Feature\Users\Registration;

use App\Exceptions\InvalidOtpException;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for completing a website registration (OTP verify → create).
 */
class VerifyRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Start a registration and return the plaintext PIN issued for it.
     */
    private function startAndCapturePin(string $email): string
    {
        Mail::fake();
        User::startRegistration(['email' => $email, 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp']);

        $pin = null;
        Mail::assertSent(UserRegistrationOtpMail::class, function (UserRegistrationOtpMail $mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        return $pin;
    }

    /**
     * A correct PIN creates exactly one DRAFT website user and returns a token.
     */
    public function test_verify_creates_a_draft_user_and_returns_a_token(): void
    {
        Administrator::factory()->create(['id' => 1, 'photo_uuid' => 'default-photo']);
        $pin = $this->startAndCapturePin('user@example.com');

        $token = User::completeRegistration('user@example.com', $pin, 'Secret@123');

        $this->assertIsString($token);
        $this->assertNotEmpty($token);

        $user = User::first();
        $this->assertSame('user@example.com', $user->email);
        $this->assertSame('Acme Corp', $user->company_name); // captured at register, decrypts from the PII blob
        $this->assertSame('draft', $user->status);
        $this->assertSame('website', $user->registration_method);
        $this->assertSame('website', $user->authentication_method);
        $this->assertSame('PH', $user->country_code); // address country defaulted at creation
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->photo_uuid); // registration no longer assigns a default photo
        $this->assertTrue(Hash::check('Secret@123', $user->getAttributes()['password']));
        // Email stored plain and blind-indexed.
        $this->assertSame(app(PiiCrypter::class)->hash('user@example.com'), $user->getAttributes()['email_hash']);
    }

    /**
     * A wrong PIN throws invalid_otp and creates no user.
     */
    public function test_verify_with_wrong_pin_creates_no_user(): void
    {
        $this->startAndCapturePin('user@example.com');

        $this->expectException(InvalidOtpException::class);

        try {
            User::completeRegistration('user@example.com', '000000', 'Secret@123');
        } finally {
            $this->assertDatabaseCount('users', 0);
        }
    }

    /**
     * The failure envelope is identical whether the account (registration) exists
     * or not — no remaining_attempts meta either way — so verify-registration is
     * not an account-existence oracle. (F6)
     */
    public function test_verify_failure_envelope_does_not_leak_account_existence(): void
    {
        $this->startAndCapturePin('user@example.com'); // an in-progress registration exists

        $existing = $this->postJson('/api/v1/user/verify-registration', [
            'channel' => 'email', 'email' => 'user@example.com',
            'otp' => '000000', 'password' => 'Secret@123', 'password_confirmation' => 'Secret@123',
        ])->assertStatus(400)->assertJsonPath('error', 'invalid_otp');

        $missing = $this->postJson('/api/v1/user/verify-registration', [
            'channel' => 'email', 'email' => 'nobody@example.com',
            'otp' => '000000', 'password' => 'Secret@123', 'password_confirmation' => 'Secret@123',
        ])->assertStatus(400)->assertJsonPath('error', 'invalid_otp');

        $existing->assertJsonMissingPath('meta.remaining_attempts');
        $missing->assertJsonMissingPath('meta.remaining_attempts');
        $this->assertSame($existing->json(), $missing->json());
    }

    /**
     * verify-registration is throttled — the anti-enumeration flow can't be probed
     * without limit. (F6)
     */
    public function test_verify_registration_is_throttled(): void
    {
        $statuses = [];
        for ($i = 0; $i < 12; $i++) {
            $statuses[] = $this->postJson('/api/v1/user/verify-registration', [
                'channel' => 'email', 'email' => 'flood@example.com',
                'otp' => '000000', 'password' => 'Secret@123', 'password_confirmation' => 'Secret@123',
            ])->getStatusCode();
        }

        $this->assertContains(429, $statuses);
    }

    /**
     * Verifying without a cached payload (e.g. expired) throws invalid_otp.
     */
    public function test_verify_without_cached_payload_throws(): void
    {
        $pin = $this->startAndCapturePin('user@example.com');
        Cache::forget(User::registrationCacheKey('user@example.com'));

        $this->expectException(InvalidOtpException::class);
        User::completeRegistration('user@example.com', $pin, 'Secret@123');
    }
}
