<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for the administrator profile endpoint.
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An authenticated administrator receives their profile.
     */
    public function test_authenticated_administrator_gets_profile(): void
    {
        $administrator = Administrator::factory()->create();
        Sanctum::actingAs($administrator, guard: 'administrators');

        $response = $this->getJson('/api/v1/administrator/profile');

        $response->assertOk();
        $response->assertJsonPath('data.id', $administrator->id);
        $response->assertJsonMissingPath('data.password');
        $response->assertJsonMissingPath('data.created_at');
    }

    /**
     * An unauthenticated request is rejected with 401.
     */
    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/administrator/profile');

        $response->assertStatus(401);
        $response->assertJson(['error' => 'unauthenticated']);
    }

    /**
     * The profile tells the client when the server will expire the session, as
     * slid by this very request, plus the inactivity window that defines it.
     */
    public function test_profile_exposes_the_session_window(): void
    {
        config(['auth.administrators.token_inactivity_minutes' => 60]);
        $administrator = Administrator::factory()->create();
        $token = $administrator->createToken('administrator', ['*'], now()->addMinutes(60))->plainTextToken;
        $this->travel(20)->minutes();

        $this->withToken($token)->getJson('/api/v1/administrator/profile')
            ->assertOk()
            ->assertJsonPath('data.session_inactivity_minutes', 60)
            ->assertJsonPath('data.token_expires_at', now()->addMinutes(60)->format('Y-m-d H:i:s'));
    }
}
