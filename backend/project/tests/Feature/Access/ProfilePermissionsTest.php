<?php

namespace Tests\Feature\Access;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature test asserting the profile returns the token's permissions.
 */
class ProfilePermissionsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The profile returns the abilities carried by the presented token.
     *
     * A real (persisted) token is used so its `abilities` are read back — the
     * Sanctum::actingAs mock does not expose an abilities array.
     */
    public function test_profile_returns_token_permissions(): void
    {
        $admin = Administrator::factory()->create(['is_active' => true, 'with_temporary_password' => false]);
        $token = $admin->createToken('administrators', ['administrators-view', 'roles-view'])->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/administrator/profile');

        $response->assertOk();
        $response->assertJsonPath('data.permissions', ['administrators-view', 'roles-view']);
    }
}
