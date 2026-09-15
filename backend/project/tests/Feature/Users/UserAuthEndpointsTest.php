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
}
