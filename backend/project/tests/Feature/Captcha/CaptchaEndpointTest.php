<?php

namespace Tests\Feature\Captcha;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests that captcha is enforced on the auth endpoints when enabled.
 */
class CaptchaEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Enable captcha; disable 2FA so authenticate issues a token directly.
     */
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.turnstile.enabled' => true,
            'services.turnstile.verify_url' => 'https://cf.test/v',
            'auth.administrators.two_factor.enabled' => false,
        ]);
    }

    /**
     * authenticate succeeds with a valid captcha token.
     */
    public function test_authenticate_passes_with_valid_captcha(): void
    {
        Http::fake(['cf.test/*' => Http::response(['success' => true])]);
        Administrator::factory()->create(['email' => 'ada@admin.test', 'password' => 'secret-password', 'is_active' => true]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
            'captcha' => 'good-token',
        ])->assertOk();
    }

    /**
     * authenticate returns 422 on the captcha field when the token is rejected.
     */
    public function test_authenticate_fails_with_invalid_captcha(): void
    {
        Http::fake(['cf.test/*' => Http::response(['success' => false])]);
        Administrator::factory()->create(['email' => 'ada@admin.test', 'password' => 'secret-password', 'is_active' => true]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
            'captcha' => 'bad-token',
        ])->assertStatus(422)->assertJsonValidationErrors('captcha');
    }

    /**
     * A missing captcha is a 422 required error when enabled.
     */
    public function test_missing_captcha_is_required(): void
    {
        Administrator::factory()->create(['email' => 'ada@admin.test', 'password' => 'secret-password', 'is_active' => true]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
        ])->assertStatus(422)->assertJsonValidationErrors('captcha');
    }
}
