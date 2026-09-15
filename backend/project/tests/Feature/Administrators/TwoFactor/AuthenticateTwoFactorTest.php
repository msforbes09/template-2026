<?php

namespace Tests\Feature\Administrators\TwoFactor;

use App\Mail\Administrators\Admin2faOtpMail;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Otps\Otp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Tests 2FA behaviour of the authenticate endpoint.
 */
class AuthenticateTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Enable 2FA for these tests (phpunit disables it by default).
     */
    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.administrators.two_factor.enabled' => true]);
    }

    /**
     * With 2FA on, valid credentials return 428 and email an OTP.
     */
    public function test_valid_credentials_require_two_factor(): void
    {
        Mail::fake();
        Administrator::factory()->create([
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
        ]);

        $response->assertStatus(428)->assertJsonPath('error', 'two_factor_required');
        $this->assertNotEmpty($response->json('meta.auth_token'));
        $this->assertNotEmpty($response->json('meta.resend_token'));
        $this->assertSame(60, $response->json('meta.retry_after'));
        $this->assertSame(1, Otp::where('type', 'admin_2fa')->count());
        Mail::assertSent(Admin2faOtpMail::class);
    }

    /**
     * With 2FA disabled, valid credentials return a token directly.
     */
    public function test_disabled_two_factor_returns_token(): void
    {
        config(['auth.administrators.two_factor.enabled' => false]);
        Administrator::factory()->create([
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * Login is throttled to 5 attempts per minute per client IP — distinct
     * emails from the same IP still count against one bucket.
     */
    public function test_authenticate_is_throttled_by_ip(): void
    {
        config(['auth.administrators.two_factor.enabled' => false]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/administrator/authenticate', [
                'email' => "user{$attempt}@admin.test",
                'password' => 'whatever',
            ])->assertStatus(400);
        }

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'another@admin.test',
            'password' => 'whatever',
        ])->assertStatus(429)->assertJsonPath('error', 'too_many_requests');
    }
}
