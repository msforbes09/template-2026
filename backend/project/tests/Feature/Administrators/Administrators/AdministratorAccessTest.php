<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Access control for the administrators management endpoints.
 */
class AdministratorAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The management endpoints require authentication.
     */
    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/administrator/administrators');

        $response->assertStatus(401);
        $response->assertJson(['error' => 'unauthenticated']);
    }

    /**
     * An admin with a temporary password cannot access the management endpoints.
     */
    public function test_temporary_password_admin_is_blocked(): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => true]),
            guard: 'administrators',
        );

        $this->getJson('/api/v1/administrator/administrators')
            ->assertStatus(403)
            ->assertJson(['error' => 'temporary_password']);
    }
}
