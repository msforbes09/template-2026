<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for administrator authentication (login).
 */
class AuthenticateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Valid credentials return a token and set last_login_at.
     */
    public function test_valid_credentials_return_a_token(): void
    {
        $administrator = Administrator::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['token']);
        $this->assertNotNull($administrator->fresh()->last_login_at);
    }

    /**
     * Logging in invalidates the administrator's existing tokens.
     */
    public function test_login_invalidates_existing_tokens(): void
    {
        $administrator = Administrator::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
        ]);
        $oldTokenId = $administrator->createToken('old')->accessToken->id;

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
        ])->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $oldTokenId]);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    /**
     * A wrong password is rejected with 400 (invalid_credentials).
     */
    public function test_wrong_password_is_rejected(): void
    {
        Administrator::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
        ]);

        $response = $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'admin@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(400);
        $response->assertJson(['error' => 'invalid_credentials']);
    }

    /**
     * An inactive account is rejected with 400 (account_inactive).
     */
    public function test_inactive_account_is_rejected(): void
    {
        Administrator::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'admin@example.com',
            'password' => 'Secret@123',
        ]);

        $response->assertStatus(400);
        $response->assertJson(['error' => 'account_inactive']);
    }
}
