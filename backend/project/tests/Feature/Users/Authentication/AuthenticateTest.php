<?php

namespace Tests\Feature\Users\Authentication;

use App\Enums\UserStatusEnum;
use App\Exceptions\InactiveAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\TwoFactorRequiredException;
use App\Mail\Users\User2faOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for native user password login (and its 2FA handshake).
 */
class AuthenticateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a website user with a known password.
     */
    private function websiteUser(string $email = 'user@example.com'): User
    {
        return User::create([
            'email' => $email, 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => UserStatusEnum::DRAFT->value, 'is_active' => true,
        ]);
    }

    /**
     * The new 2FA columns persist and cast correctly.
     */
    public function test_two_factor_columns_persist_and_cast(): void
    {
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'auth_token' => hash('sha256', 'handle'),
            'auth_token_expires_at' => now()->addMinutes(35),
            'trusted_devices' => [['device' => 'abc', 'trusted_at' => now()->format('Y-m-d H:i:s')]],
        ]);

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->auth_token_expires_at);
        $this->assertIsArray($fresh->trusted_devices);
        $this->assertSame('abc', $fresh->trusted_devices[0]['device']);
    }

    /**
     * With 2FA disabled, valid credentials return a token directly.
     */
    public function test_authenticate_without_2fa_returns_a_token(): void
    {
        config(['auth.users.two_factor.enabled' => false]);
        $this->websiteUser();

        $token = User::attemptTwoFactor(['email' => 'User@Example.com', 'password' => 'Secret@123']);

        $this->assertNotEmpty($token);
        $this->assertNotNull(User::first()->last_login_at);
    }

    /**
     * With 2FA enabled and no trusted device, valid credentials start the
     * handshake: an OTP is emailed and a 428 is thrown.
     */
    public function test_authenticate_with_2fa_starts_the_handshake(): void
    {
        config(['auth.users.two_factor.enabled' => true]);
        Mail::fake();
        $this->websiteUser();

        try {
            User::attemptTwoFactor(['email' => 'user@example.com', 'password' => 'Secret@123']);
            $this->fail('Expected TwoFactorRequiredException');
        } catch (TwoFactorRequiredException $e) {
            $this->assertArrayHasKey('auth_token', $e->getMeta());
            $this->assertArrayHasKey('resend_token', $e->getMeta());
        }

        $this->assertDatabaseHas('otps', ['type' => 'user_2fa_email', 'identifier' => 'user@example.com']);
        $this->assertNotNull(User::first()->auth_token);
        $this->assertNotNull(User::first()->auth_token_expires_at);
        Mail::assertSent(User2faOtpMail::class);
    }

    /**
     * A wrong password, an unknown email, and a password-less account all fail
     * identically as invalid credentials.
     */
    public function test_invalid_credentials_are_uniform(): void
    {
        $this->websiteUser();
        User::create([ // no password set
            'email' => 'nopass@example.com', 'first_name' => 'S', 'last_name' => 'O',
            'email_verified_at' => now(),
        ]);

        foreach ([
            ['email' => 'user@example.com', 'password' => 'wrong'],
            ['email' => 'nobody@example.com', 'password' => 'whatever'],
            ['email' => 'nopass@example.com', 'password' => 'whatever'],
        ] as $creds) {
            try {
                User::attemptTwoFactor($creds);
                $this->fail('Expected InvalidCredentialsException');
            } catch (InvalidCredentialsException) {
                $this->assertTrue(true);
            }
        }
    }

    /**
     * An inactive account is rejected at the password step.
     */
    public function test_inactive_account_is_rejected(): void
    {
        $this->websiteUser()->update(['is_active' => false]);

        $this->expectException(InactiveAccountException::class);
        User::attemptTwoFactor(['email' => 'user@example.com', 'password' => 'Secret@123']);
    }
}
