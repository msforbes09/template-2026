<?php

namespace Tests\Feature\Users\Password;

use App\Models\Users\User;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Fakes\FakeSmsSender;
use Tests\TestCase;

/**
 * Forgot / reset password over the SMS channel (keyed on the mobile number).
 */
class PasswordResetViaMobileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The recording SMS double bound for the test.
     */
    private FakeSmsSender $sms;

    /**
     * Bind the recording SMS double in place of the real provider.
     */
    private function fakeSms(): void
    {
        $this->sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $this->sms);
    }

    /**
     * A mobile-only user with a password.
     */
    private function mobileUser(): User
    {
        return User::create([
            'mobile_number' => '+639171234567', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp', 'password' => 'Secret@123', 'mobile_number_verified_at' => now(),
            'status' => 'draft', 'registration_method' => 'website', 'is_active' => true,
        ]);
    }

    /**
     * The 6-digit PIN from the SMS that was sent.
     */
    private function capturePin(): string
    {
        return (string) $this->sms->pin();
    }

    /**
     * A resettable mobile account gets a reset code and can set a new password.
     */
    public function test_forgot_and_reset_via_mobile(): void
    {
        $this->fakeSms();
        $user = $this->mobileUser();

        $this->postJson('/api/v1/user/forgot-password', [
            'channel' => 'sms', 'mobile_number' => '+639171234567',
        ])->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        $this->assertDatabaseHas('otps', ['type' => 'user_password_reset_sms', 'identifier' => '+639171234567']);

        $pin = $this->capturePin();

        $this->postJson('/api/v1/user/reset-password', [
            'channel' => 'sms', 'mobile_number' => '+639171234567', 'otp' => $pin,
            'new_password' => 'BrandNew@456', 'new_password_confirmation' => 'BrandNew@456',
        ])->assertOk()->assertJsonStructure(['token']);

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('BrandNew@456', $fresh->getAttributes()['password']));
        $this->assertSame('sms', $fresh->authentication_channel);
    }

    /**
     * An unknown mobile number gets the "no account" notice type (anti-enumeration).
     */
    public function test_forgot_via_mobile_unknown_number_uses_no_account_type(): void
    {
        $this->fakeSms();

        $this->postJson('/api/v1/user/forgot-password', [
            'channel' => 'sms', 'mobile_number' => '+639999999999',
        ])->assertOk();

        $this->assertDatabaseHas('otps', ['type' => 'user_password_reset_no_account_sms', 'identifier' => '+639999999999']);
    }
}
