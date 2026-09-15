<?php

namespace Tests\Feature\Users\Authentication;

use App\Models\Users\User;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Fakes\FakeSmsSender;
use Tests\TestCase;

/**
 * Native login over the SMS channel (mobile number + password + SMS-OTP 2FA).
 */
class AuthenticateViaMobileTest extends TestCase
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
     * With 2FA disabled, a mobile login returns a token and records the channel.
     */
    public function test_mobile_login_without_2fa_returns_token(): void
    {
        config(['auth.users.two_factor.enabled' => false]);
        $user = $this->mobileUser();

        $this->postJson('/api/v1/user/authenticate', [
            'channel' => 'sms', 'mobile_number' => '+639171234567', 'password' => 'Secret@123',
        ])->assertOk()->assertJsonStructure(['token']);

        $this->assertSame('sms', $user->fresh()->authentication_channel);
    }

    /**
     * With 2FA enabled, a mobile login texts an OTP (user_2fa_sms) and the
     * handshake completes to a token.
     */
    public function test_mobile_login_with_2fa_texts_otp_and_completes(): void
    {
        config(['auth.users.two_factor.enabled' => true]);
        $this->fakeSms();
        $user = $this->mobileUser();

        $authToken = $this->postJson('/api/v1/user/authenticate', [
            'channel' => 'sms', 'mobile_number' => '+639171234567', 'password' => 'Secret@123',
        ])->assertStatus(428)->json('meta.auth_token');

        $this->assertDatabaseHas('otps', ['type' => 'user_2fa_sms', 'identifier' => '+639171234567']);

        $pin = $this->capturePin();

        $this->postJson('/api/v1/user/two-factor-authenticate', [
            'channel' => 'sms', 'auth_token' => $authToken, 'pin' => $pin,
        ])->assertOk()->assertJsonStructure(['token', 'device_token']);

        $this->assertSame('sms', $user->fresh()->authentication_channel);
    }

    /**
     * Wrong credentials for a mobile login are rejected identically to email.
     */
    public function test_mobile_login_with_wrong_password_is_rejected(): void
    {
        $this->mobileUser();

        $this->postJson('/api/v1/user/authenticate', [
            'channel' => 'sms', 'mobile_number' => '+639171234567', 'password' => 'WrongPass@1',
        ])->assertStatus(400)->assertJson(['error' => 'invalid_credentials']);
    }
}
