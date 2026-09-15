<?php

namespace Tests\Feature\Security;

use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Batch-1 security hardening for the user surface: activation, one-shot
 * credentials, token lifetime, and the SSO read-only guard for inactive accounts.
 */
class UserSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A user token past its absolute lifetime is rejected even while active.
     */
    public function test_user_token_past_absolute_lifetime_is_rejected(): void
    {
        config(['auth.users.token_absolute_minutes' => 60]);
        $user = User::factory()->create();

        $plain = $user->createToken('t', ['*']);
        $plain->accessToken->forceFill(['created_at' => now()->subMinutes(61)])->save();

        $this->withToken($plain->plainTextToken)->getJson('/api/v1/user/profile')
            ->assertUnauthorized();
    }
}
