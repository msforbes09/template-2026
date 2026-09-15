<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Tests for inactivity-based token expiry.
 */
class TokenInactivityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A token expires after the inactivity window with no requests.
     */
    public function test_token_expires_after_inactivity(): void
    {
        config(['auth.administrators.token_inactivity_minutes' => 60]);
        $administrator = Administrator::factory()->create();
        $token = $administrator->createToken('administrator', ['*'], now()->addMinutes(60))->plainTextToken;
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->travel(61)->minutes();
        $this->getJson('/api/v1/administrator/profile', $auth)->assertStatus(401);
    }

    /**
     * Activity within the window keeps the token alive (sliding expiry).
     */
    public function test_activity_refreshes_the_expiry(): void
    {
        config(['auth.administrators.token_inactivity_minutes' => 60]);
        $administrator = Administrator::factory()->create();
        $newToken = $administrator->createToken('administrator', ['*'], now()->addMinutes(60));
        $auth = ['Authorization' => "Bearer {$newToken->plainTextToken}"];

        $this->travel(50)->minutes();
        $this->getJson('/api/v1/administrator/profile', $auth)->assertOk();

        // The middleware should have pushed expiry to now (+50) + 60 minutes.
        $expiresAt = PersonalAccessToken::find($newToken->accessToken->id)->expires_at;
        $this->assertTrue($expiresAt->greaterThan(now()->addMinutes(59)));
    }
}
