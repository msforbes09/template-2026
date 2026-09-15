<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for administrator logout.
 */
class LogoutTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Logout returns the profile and revokes all of the administrator's tokens.
     */
    public function test_logout_revokes_all_tokens(): void
    {
        $administrator = Administrator::factory()->create();
        $token = $administrator->createToken('administrator')->plainTextToken;
        $administrator->createToken('another-device');
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->assertDatabaseCount('personal_access_tokens', 2);

        $response = $this->postJson('/api/v1/administrator/logout', [], $auth);
        $response->assertOk();
        $response->assertJsonPath('data.id', $administrator->id);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
