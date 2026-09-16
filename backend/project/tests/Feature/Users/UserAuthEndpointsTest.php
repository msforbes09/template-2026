<?php

namespace Tests\Feature\Users;

use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests the user auth endpoints (profile / logout).
 */
class UserAuthEndpointsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Profile returns the UserProfileResource (uuid, never id or password).
     */
    public function test_profile_returns_profile_resource(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->getJson('/api/v1/user/profile')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.status', $user->status)
            ->assertJsonPath('data.uuid', $user->uuid)   // exposed so the FE knows its private broadcast channel (private-user.{uuid})
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.is_active')
            ->assertJsonMissingPath('data.permissions');
    }

    /**
     * Logout revokes the user's tokens.
     */
    public function test_logout_revokes_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken('user');
        $this->assertSame(1, $user->tokens()->count());

        Sanctum::actingAs($user, ['*'], 'users');
        $this->postJson('/api/v1/user/logout')->assertOk();

        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    /**
     * The profile tells the client when the server will expire the session, as
     * slid by this very request, plus the inactivity window that defines it.
     */
    public function test_profile_exposes_the_session_window(): void
    {
        config(['auth.users.token_inactivity_minutes' => 60]);
        $user = User::create([
            'email' => 'window@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);
        $token = $user->createToken('users', ['*'], now()->addMinutes(60))->plainTextToken;
        $this->travel(20)->minutes();

        $this->withToken($token)->getJson('/api/v1/user/profile')
            ->assertOk()
            ->assertJsonPath('data.session_inactivity_minutes', 60)
            ->assertJsonPath('data.token_expires_at', now()->addMinutes(60)->format('Y-m-d H:i:s'));
    }
}
