<?php

namespace Tests\Feature\Security;

use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A credential change (reset or change) must invalidate the pending-2FA handshake
 * and every trusted device, so a stale auth_token / trusted device can't survive
 * to complete authentication after the account is re-secured.
 */
class CredentialChangeClearsTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Admin password reset clears auth_token, auth_validated and trusted_device.
     */
    public function test_admin_reset_clears_two_factor_state(): void
    {
        $admin = Administrator::factory()->create([
            'auth_token' => hash('sha256', 'pending'), 'auth_validated' => now(), 'trusted_device' => hash('sha256', 'dev'),
        ]);

        $admin->resetPassword();

        $fresh = $admin->fresh();
        $this->assertNull($fresh->auth_token);
        $this->assertNull($fresh->auth_validated);
        $this->assertNull($fresh->trusted_device);
    }

    /**
     * Admin password change (authenticated) clears the same state.
     */
    public function test_admin_change_clears_two_factor_state(): void
    {
        $admin = Administrator::factory()->create([
            'auth_token' => hash('sha256', 'pending'), 'auth_validated' => now(), 'trusted_device' => hash('sha256', 'dev'),
        ]);

        $admin->changePassword('BrandNew@456');

        $this->assertNull($admin->fresh()->trusted_device);
    }

    /**
     * User password change clears auth_token, its expiry and every trusted device.
     */
    public function test_user_change_clears_two_factor_state(): void
    {
        $user = User::factory()->create([
            'auth_token' => hash('sha256', 'pending'),
            'auth_token_expires_at' => now()->addMinutes(30),
            'trusted_devices' => [['device' => hash('sha256', 'dev'), 'trusted_at' => '2026-07-18 00:00:00']],
        ]);

        $user->updatePassword('BrandNew@456');

        $fresh = $user->fresh();
        $this->assertNull($fresh->auth_token);
        $this->assertNull($fresh->auth_token_expires_at);
        $this->assertNull($fresh->trusted_devices);
    }
}
