<?php

namespace Tests\Feature\Users\Password;

use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests for the authenticated change-password endpoint.
 */
class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user with a known password.
     */
    private function user(): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    /**
     * Right current + a valid, different new password → 200 with a fresh token.
     */
    public function test_change_password_succeeds(): void
    {
        Sanctum::actingAs($this->user(), ['*'], 'users');
        $this->travel(25)->hours(); // past the minimum password age

        $this->postJson('/api/v1/user/change-password', [
            'current_password' => 'Secret@123',
            'new_password' => 'BrandNew@456', 'new_password_confirmation' => 'BrandNew@456',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    /**
     * A wrong current password is rejected.
     */
    public function test_wrong_current_password_is_rejected(): void
    {
        Sanctum::actingAs($this->user(), ['*'], 'users');

        $this->postJson('/api/v1/user/change-password', [
            'current_password' => 'nope', 'new_password' => 'BrandNew@456', 'new_password_confirmation' => 'BrandNew@456',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }

    /**
     * A new password identical to the current one is rejected.
     */
    public function test_same_new_password_is_rejected(): void
    {
        Sanctum::actingAs($this->user(), ['*'], 'users');

        $this->postJson('/api/v1/user/change-password', [
            'current_password' => 'Secret@123', 'new_password' => 'Secret@123', 'new_password_confirmation' => 'Secret@123',
        ])->assertStatus(422)->assertJsonValidationErrors('new_password');
    }
}
