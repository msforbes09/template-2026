<?php

namespace Tests\Feature\Administrators\TwoFactor;

use App\Models\Administrators\Administrator;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Tests the two_factor_authenticate endpoint.
 */
class TwoFactorAuthenticateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Enable 2FA for these tests.
     */
    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.administrators.two_factor.enabled' => true]);
        Mail::fake();
    }

    /**
     * A correct PIN issues a token + device token and trusts the device.
     */
    public function test_correct_pin_issues_token_and_device_token(): void
    {
        $admin = Administrator::factory()->create(['email' => 'ada@admin.test', 'is_active' => true]);
        $authToken = Str::random(64);
        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->addMinutes(30)]);
        $pin = app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin)->pin;

        $response = $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => $pin,
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'device_token']);
        $fresh = $admin->fresh();
        $this->assertNull($fresh->auth_token);
        $this->assertNotNull($fresh->auth_validated);
        $this->assertNotNull($fresh->trusted_device);
    }

    /**
     * A wrong PIN is rejected with invalid_otp.
     */
    public function test_wrong_pin_is_rejected(): void
    {
        $admin = Administrator::factory()->create(['email' => 'ada@admin.test', 'is_active' => true]);
        $authToken = Str::random(64);
        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->addMinutes(30)]);
        app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin);

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => '000000',
        ])->assertStatus(400)->assertJsonPath('error', 'invalid_otp');
    }

    /**
     * The super administrator (id 1) may NOT complete 2FA with today's date as the
     * PIN. This used to be a supported recovery path, and it was a backdoor: one
     * guessable value per day, skipping OTP verification outright, on the account
     * that holds every permission.
     */
    public function test_super_admin_cannot_complete_with_date_pin(): void
    {
        $admin = Administrator::factory()->create(['email' => 'super@admin.test', 'is_active' => true]);
        $this->assertSame(1, $admin->id);
        $authToken = Str::random(64);
        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->addMinutes(30)]);

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => now()->format('mdy'),
        ])->assertStatus(400);

        $this->assertNotNull($admin->fresh()->auth_token, 'The handshake must not have completed.');
    }

    /**
     * The device token returned then skips 2FA on the next authenticate.
     */
    public function test_returned_device_token_skips_two_factor(): void
    {
        $admin = Administrator::factory()->create(['email' => 'ada@admin.test', 'password' => 'secret-password', 'is_active' => true]);
        $authToken = Str::random(64);
        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->addMinutes(30)]);
        $pin = app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin)->pin;

        $deviceToken = $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => $pin,
        ])->json('device_token');

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
            'device_token' => $deviceToken,
        ])->assertOk()->assertJsonStructure(['token']);
    }
}
