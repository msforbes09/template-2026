<?php

namespace Tests\Feature\Users\Authentication;

use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\TwoFactorRequiredException;
use App\Mail\Users\User2faOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for completing the user 2FA handshake.
 */
class TwoFactorAuthenticateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Start a 2FA handshake and return [authToken, pin].
     *
     * @return array{0: string, 1: string}
     */
    private function startHandshake(): array
    {
        config(['auth.users.two_factor.enabled' => true]);
        Mail::fake();
        User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);

        $authToken = null;
        try {
            User::attemptTwoFactor(['email' => 'user@example.com', 'password' => 'Secret@123']);
        } catch (TwoFactorRequiredException $e) {
            $authToken = $e->getMeta()['auth_token'];
        }

        $pin = null;
        Mail::assertSent(User2faOtpMail::class, function (User2faOtpMail $m) use (&$pin) {
            $pin = $m->pin;

            return true;
        });

        return [$authToken, $pin];
    }

    /**
     * A correct PIN issues a token, a device token, clears the handle, and trusts
     * the device.
     */
    public function test_complete_issues_token_and_trusts_device(): void
    {
        [$authToken, $pin] = $this->startHandshake();

        $result = User::completeTwoFactor($authToken, $pin);

        $this->assertNotEmpty($result['token']);
        $this->assertNotEmpty($result['device_token']);

        $user = User::first();
        $this->assertNull($user->auth_token);
        $this->assertNull($user->auth_token_expires_at);
        $this->assertCount(1, $user->trusted_devices);
        // Stored hashed, never the plaintext token.
        $this->assertSame(hash('sha256', $result['device_token']), $user->trusted_devices[0]['device']);
        $this->assertNotNull($user->last_login_at);
    }

    /**
     * A wrong PIN throws invalid_otp and issues no token.
     */
    public function test_wrong_pin_is_rejected(): void
    {
        [$authToken] = $this->startHandshake();

        $this->expectException(InvalidOtpException::class);
        User::completeTwoFactor($authToken, '000000');
    }

    /**
     * An expired auth_token cannot complete (fail closed).
     */
    public function test_expired_auth_token_is_rejected(): void
    {
        [$authToken, $pin] = $this->startHandshake();
        User::first()->update(['auth_token_expires_at' => now()->subMinute()]);

        $this->expectException(InvalidCredentialsException::class);
        User::completeTwoFactor($authToken, $pin);
    }

    /**
     * The 2FA OTP belongs to the authenticating user (so its delivery log can be
     * attributed to them).
     */
    public function test_two_factor_otp_belongs_to_the_user(): void
    {
        config(['auth.users.two_factor.enabled' => true]);
        Mail::fake();
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);

        try {
            User::attemptTwoFactor(['email' => 'user@example.com', 'password' => 'Secret@123']);
        } catch (TwoFactorRequiredException) {
        }

        $this->assertDatabaseHas('otps', ['type' => 'user_2fa', 'otpable_type' => 'User', 'otpable_id' => $user->getKey()]);
    }
}
