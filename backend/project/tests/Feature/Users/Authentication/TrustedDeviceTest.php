<?php

namespace Tests\Feature\Users\Authentication;

use App\Exceptions\TwoFactorRequiredException;
use App\Mail\Users\User2faOtpMail;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for multi-device trust (skip 2FA, window expiry, cap).
 */
class TrustedDeviceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.users.two_factor.enabled' => true]);
        Mail::fake();
    }

    /**
     * Create a user (once) and complete one 2FA handshake, returning its device token.
     */
    private function trustOneDevice(): string
    {
        User::firstOrCreate(
            [],
            ['email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
                'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true]
        );

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

        return User::completeTwoFactor($authToken, $pin)['device_token'];
    }

    /**
     * A trusted device token skips 2FA and returns a token directly.
     */
    public function test_trusted_device_skips_2fa(): void
    {
        $deviceToken = $this->trustOneDevice();

        $token = User::attemptTwoFactor(
            ['email' => 'user@example.com', 'password' => 'Secret@123'],
            $deviceToken,
        );

        $this->assertIsString($token); // no 428 thrown
    }

    /**
     * Once the trust window elapses, the device no longer skips 2FA.
     */
    public function test_expired_trust_window_requires_2fa_again(): void
    {
        $deviceToken = $this->trustOneDevice();

        $user = User::first();
        $devices = $user->trusted_devices;
        $devices[0]['trusted_at'] = now()->subSeconds((int) config('auth.users.two_factor.trust_window') + 60)->format('Y-m-d H:i:s');
        $user->update(['trusted_devices' => $devices]);

        $this->expectException(TwoFactorRequiredException::class);
        User::attemptTwoFactor(['email' => 'user@example.com', 'password' => 'Secret@123'], $deviceToken);
    }

    /**
     * Trusting more than the cap keeps only the most recent devices.
     */
    public function test_trusted_devices_are_capped(): void
    {
        config(['auth.users.two_factor.max_trusted_devices' => 2]);

        $this->trustOneDevice();
        $this->trustOneDevice();
        $this->trustOneDevice();

        $this->assertCount(2, User::first()->trusted_devices);
    }
}
