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
}
