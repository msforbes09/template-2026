<?php

namespace Tests\Feature\Users\Authentication;

use App\Mail\Users\User2faOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * End-to-end tests for the user authentication endpoints.
 */
class AuthEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function user(): void
    {
        User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    /**
     * 2FA on: authenticate returns 428, then two-factor-authenticate returns a
     * token + device token; the device then skips 2FA.
     */
    public function test_full_2fa_login_flow(): void
    {
        config(['auth.users.two_factor.enabled' => true]);
        Mail::fake();
        $this->user();

        $authToken = $this->postJson('/api/v1/user/authenticate', [
            'email' => 'user@example.com', 'password' => 'Secret@123',
        ])->assertStatus(428)->json('meta.auth_token');

        $pin = null;
        Mail::assertSent(User2faOtpMail::class, function ($m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        $deviceToken = $this->postJson('/api/v1/user/two-factor-authenticate', [
            'auth_token' => $authToken, 'pin' => $pin,
        ])->assertOk()->assertJsonStructure(['token', 'device_token'])->json('device_token');

        $this->postJson('/api/v1/user/authenticate', [
            'email' => 'user@example.com', 'password' => 'Secret@123', 'device_token' => $deviceToken,
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * 2FA off: authenticate returns a token directly.
     */
    public function test_login_without_2fa(): void
    {
        config(['auth.users.two_factor.enabled' => false]);
        $this->user();

        $this->postJson('/api/v1/user/authenticate', [
            'email' => 'user@example.com', 'password' => 'Secret@123',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * Bad credentials return the uniform 400 invalid_credentials envelope.
     */
    public function test_bad_credentials_return_400(): void
    {
        $this->user();

        $this->postJson('/api/v1/user/authenticate', [
            'email' => 'user@example.com', 'password' => 'wrong',
        ])->assertStatus(400)->assertJson(['error' => 'invalid_credentials']);
    }
}
