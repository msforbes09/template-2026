<?php

namespace Tests\Feature\Administrators\TwoFactor;

use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Models\Administrators\Administrator;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The 2FA handshake, hardened: no date-PIN backdoor, no unthrottled guessing, no
 * completing the handshake after the account has been switched off.
 */
class TwoFactorHardeningTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Put an admin mid-handshake — credentials verified, OTP pending — and return
     * the plaintext auth_token the client would be holding.
     */
    private function pendingHandshake(Administrator $admin): string
    {
        $authToken = Str::random(64);

        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->addMinutes(30)]);

        return $authToken;
    }

    /**
     * FINDING 01 — the backdoor. Today's date used to complete 2FA for the super
     * administrator, skipping OTP verification entirely.
     */
    public function test_todays_date_is_not_accepted_as_a_pin(): void
    {
        $admin = Administrator::factory()->create(['id' => 1, 'is_active' => true]);
        $authToken = $this->pendingHandshake($admin);

        app(OtpService::class)->generate('admin_2fa', $admin->email, $admin);

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => now()->format('mdy'),
        ])->assertStatus(400);

        $this->assertNotNull($admin->fresh()->auth_token, 'The handshake must not have completed.');
    }

    /**
     * R3 — an EXPIRED handshake handle cannot complete 2FA even with a valid OTP,
     * so a stale auth_token (from a proxy log / abandoned login) is not redeemable.
     */
    public function test_an_expired_handshake_handle_cannot_complete_2fa(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true]);
        $authToken = Str::random(64);
        $admin->update(['auth_token' => hash('sha256', $authToken), 'auth_token_expires_at' => now()->subMinute()]);
        $pin = app(OtpService::class)->generate('admin_2fa', $admin->email, $admin)->pin;

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => $pin,
        ])->assertStatus(400)->assertJsonPath('error', 'invalid_credentials');

        $this->assertNotNull($admin->fresh()->auth_token, 'The handshake must not have completed.');
    }

    /**
     * FINDING 11 — an admin switched off mid-handshake must not be able to complete
     * 2FA and walk away with a bearer token.
     */
    public function test_an_admin_deactivated_mid_handshake_cannot_complete_2fa(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true]);
        $authToken = $this->pendingHandshake($admin);
        $pin = app(OtpService::class)->generate('admin_2fa', $admin->email, $admin)->pin;

        // Switched off behind the scenes, without going through toggleActiveStatus().
        $admin->updateQuietly(['is_active' => false]);

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => $pin,
        ])->assertStatus(400)->assertJson(['error' => 'account_inactive']);
    }

    /**
     * FINDING 11 — deactivating an admin kills any handshake already in flight, so a
     * token issued moments before cannot be redeemed afterwards.
     */
    public function test_deactivating_an_admin_clears_a_pending_auth_token(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true]);
        $this->pendingHandshake($admin);

        $this->assertNotNull($admin->fresh()->auth_token);

        $admin->toggleActiveStatus();

        $this->assertNull($admin->fresh()->auth_token);
    }

    /**
     * FINDING 02 — the 2FA endpoint must be rate-limited. It was the one auth
     * endpoint with no throttle, while `authenticate` beside it had one.
     */
    public function test_the_two_factor_endpoint_is_rate_limited(): void
    {
        // A bogus auth_token, so every request dies at the token lookup and never
        // reaches the OTP service. That way the only thing that can produce a 429 is
        // the route throttle itself — the OTP's own lockout cannot mask its absence.
        $payload = ['auth_token' => Str::random(64), 'pin' => '000000'];

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/administrator/two-factor-authenticate', $payload)
                ->assertStatus(400);
        }

        $this->postJson('/api/v1/administrator/two-factor-authenticate', $payload)
            ->assertStatus(429);
    }

    /**
     * FINDING 02 — a resend must not wipe the wrong-PIN counter.
     *
     * It did: `resend()` set `attempts => 0`, so an attacker who had burned four of
     * their five guesses simply asked for a new PIN and got a fresh five. With five
     * resends allowed that multiplied the guess budget several times over. The count
     * must be cumulative across the OTP's whole life.
     */
    public function test_a_resend_does_not_reset_the_attempt_counter(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true]);
        $otp = app(OtpService::class)->generate('admin_2fa', $admin->email, $admin);

        // Four wrong guesses — one short of the five-attempt lockout.
        for ($i = 0; $i < 4; $i++) {
            try {
                app(OtpService::class)->verify('admin_2fa', $admin->email, '000000');
            } catch (InvalidOtpException) {
                // Wrong PIN — expected.
            }
        }

        $this->travel(61)->seconds(); // Clear the resend throttle.

        app(OtpService::class)->resend($otp->resendToken);

        // The fifth wrong guess must still trip the lockout: the resend did not
        // hand back a fresh budget.
        $this->expectException(OtpLockedException::class);

        app(OtpService::class)->verify('admin_2fa', $admin->email, '000000');
    }

    /**
     * A fresh, valid handshake still completes — the guards must not break login.
     */
    public function test_a_valid_handshake_still_completes(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true]);
        $authToken = $this->pendingHandshake($admin);
        $pin = app(OtpService::class)->generate('admin_2fa', $admin->email, $admin)->pin;

        $this->postJson('/api/v1/administrator/two-factor-authenticate', [
            'auth_token' => $authToken,
            'pin' => $pin,
        ])->assertOk()->assertJsonStructure(['token', 'device_token']);

        $this->assertNull($admin->fresh()->auth_token);
    }
}
