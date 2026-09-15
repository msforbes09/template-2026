<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests that the Administrator model is authenticatable and can issue tokens.
 */
class AdministratorTokenTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An administrator is authenticatable and can create a Sanctum token.
     */
    public function test_administrator_can_issue_a_sanctum_token(): void
    {
        $administrator = Administrator::factory()->create();

        $this->assertInstanceOf(Authenticatable::class, $administrator);

        $token = $administrator->createToken('administrator')->plainTextToken;

        $this->assertNotEmpty($token);
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_type' => 'Administrator',
            'tokenable_id' => $administrator->id,
        ]);
    }

    /**
     * The authenticated() helper returns the admin authenticated on the guard.
     */
    public function test_authenticated_returns_the_current_administrator(): void
    {
        $administrator = Administrator::factory()->create();
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->assertTrue(Administrator::authenticated()->is($administrator));
    }
}
