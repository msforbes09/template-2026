<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for the administrator change-password endpoint.
 */
class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A valid change updates the password and clears the temporary flag.
     */
    public function test_it_changes_the_password(): void
    {
        $administrator = Administrator::factory()->create([
            'password' => 'Current@123',
            'with_temporary_password' => true,
        ]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $response = $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@123',
            'new_password' => 'BrandNew@456',
            'new_password_confirmation' => 'BrandNew@456',
        ]);

        $response->assertOk();
        $fresh = $administrator->fresh();
        $this->assertTrue(Hash::check('BrandNew@456', $fresh->password));
        $this->assertFalse($fresh->with_temporary_password);
    }

    /**
     * R2 — changing the password revokes every existing token and hands back a fresh
     * one: a stolen session dies with the password.
     */
    public function test_change_revokes_existing_tokens_and_returns_a_new_one(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@123', 'with_temporary_password' => false]);
        $oldToken = $administrator->createToken('old')->plainTextToken;

        $response = $this->withToken($oldToken)->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@123',
            'new_password' => 'BrandNew@456',
            'new_password_confirmation' => 'BrandNew@456',
        ])->assertOk();

        $newToken = $response->json('token');
        $this->assertNotEmpty($newToken);
        $this->assertNotSame($oldToken, $newToken);

        // Exactly one token now (the fresh one) — the old sessions were revoked.
        $this->assertSame(1, $administrator->fresh()->tokens()->count());
        $this->withToken($newToken)->getJson('/api/v1/administrator/profile')->assertOk();
    }

    /**
     * A wrong current password is rejected.
     */
    public function test_wrong_current_password_is_rejected(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@123']);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $response = $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'nope',
            'new_password' => 'BrandNew@456',
            'new_password_confirmation' => 'BrandNew@456',
        ]);

        $response->assertStatus(422);
    }

    /**
     * A new password equal to the current one is rejected.
     */
    public function test_new_password_must_differ_from_current(): void
    {
        $administrator = Administrator::factory()->create(['password' => 'Current@123']);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $response = $this->postJson('/api/v1/administrator/change-password', [
            'current_password' => 'Current@123',
            'new_password' => 'Current@123',
            'new_password_confirmation' => 'Current@123',
        ]);

        $response->assertStatus(422);
    }
}
