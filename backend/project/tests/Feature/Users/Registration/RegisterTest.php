<?php

namespace Tests\Feature\Users\Registration;

use App\Enums\UserStatusEnum;
use App\Exceptions\InvalidOtpException;
use App\Mail\Users\UserAccountExistsMail;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for the website registration model logic (start step).
 */
class RegisterTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user row is created in DRAFT status.
     */
    public function test_a_website_user_is_persisted_in_draft(): void
    {
        $user = User::create([
            'email' => 'user@example.com',
            'first_name' => 'Alex',
            'last_name' => 'Rivera',
            'password' => 'Secret@123',
            'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value,
            'registration_method' => 'website',
            'authentication_method' => 'website',
        ]);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'draft']);
        $this->assertSame('draft', UserStatusEnum::DRAFT->value);
    }

    /**
     * Registering a free email caches the payload, issues an OTP, and sends the
     * OTP mail — without creating any users row — and returns the resend handle.
     */
    public function test_start_registration_for_a_free_email_issues_otp_and_persists_nothing(): void
    {
        Mail::fake();

        $result = User::startRegistration([
            'email' => 'User@Example.com',
            'first_name' => 'Alex',
            'last_name' => 'Rivera',
            'company_name' => 'Acme Corp',
        ]);

        $this->assertDatabaseCount('users', 0);
        // OTP is keyed on the normalized email (the deliverable identifier).
        $this->assertDatabaseHas('otps', ['type' => 'user_registration', 'identifier' => 'user@example.com']);
        $this->assertTrue(Cache::has(User::registrationCacheKey('user@example.com')));
        // The company captured at the start step is cached with the pending payload.
        $this->assertSame('Acme Corp', Cache::get(User::registrationCacheKey('user@example.com'))['company_name']);
        $this->assertNotEmpty($result->resendToken);
        $this->assertGreaterThan(0, $result->retryAfter);
        Mail::assertSent(UserRegistrationOtpMail::class);
    }

    /**
     * An already-registered email is indistinguishable to the requester (an OTP
     * is still generated under a distinct type, same response) but is mailed the
     * "account exists" notice instead of the OTP — and cannot be completed.
     */
    public function test_start_registration_for_a_taken_email_sends_the_notice_and_cannot_complete(): void
    {
        Mail::fake();

        User::create([
            'email' => 'taken@example.com', 'first_name' => 'A', 'last_name' => 'B',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value,
        ]);

        // An OTP is generated (throttle/response parity) under the "exists" type,
        // so the delivered email is the notice, not the OTP.
        $result = User::startRegistration(['email' => 'taken@example.com', 'first_name' => 'C', 'last_name' => 'D']);

        $this->assertDatabaseHas('otps', ['type' => 'user_registration_exists', 'identifier' => 'taken@example.com']);
        Mail::assertSent(UserAccountExistsMail::class);
        Mail::assertNotSent(UserRegistrationOtpMail::class);

        // Even with the real PIN, the already-registered email cannot complete.
        $this->expectException(InvalidOtpException::class);

        try {
            User::completeRegistration('taken@example.com', $result->pin, 'Secret@123');
        } finally {
            $this->assertDatabaseCount('users', 1);
        }
    }
}
