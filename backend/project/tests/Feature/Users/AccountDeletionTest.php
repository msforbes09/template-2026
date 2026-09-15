<?php

namespace Tests\Feature\Users;

use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * User self-service account deletion: password-confirmed soft delete that revokes
 * credentials/tokens/2FA, is logged, retains data, and still renders in the log viewer.
 */
class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A web-registered user with a known password.
     */
    private function passwordUser(): User
    {
        return User::factory()->create(['password' => 'Secret@123']);
    }

    /**
     * Deleting with the correct password soft-deletes the account and clears its
     * tokens and 2FA state.
     */
    public function test_deletes_account_with_correct_password(): void
    {
        $user = $this->passwordUser();
        $user->createToken('device-a');
        Sanctum::actingAs($user, ['*'], 'users');

        $this->deleteJson('/api/v1/user/profile', ['password' => 'Secret@123'])
            ->assertOk()
            // Same envelope as the profile show/update, for consistency.
            ->assertJsonPath('data.uuid', $user->uuid);

        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseHas((new AuthAttempt)->getTable(), [
            'event' => 'account_deleted', 'user_type' => 'User', 'user_id' => $user->id,
        ]);
    }

    /**
     * The wrong password is rejected and the account survives.
     */
    public function test_wrong_password_is_rejected(): void
    {
        $user = $this->passwordUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->deleteJson('/api/v1/user/profile', ['password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
    }

    /**
     * Deletion requires authentication.
     */
    public function test_requires_authentication(): void
    {
        $this->deleteJson('/api/v1/user/profile', ['password' => 'x'])->assertUnauthorized();
    }

    /**
     * After deletion the user is excluded from default queries but resolvable via
     * withTrashed (so logs can still attribute it).
     */
    public function test_deleted_user_is_trashed_not_gone(): void
    {
        $user = $this->passwordUser();
        Sanctum::actingAs($user, ['*'], 'users');
        $this->deleteJson('/api/v1/user/profile', ['password' => 'Secret@123'])->assertOk();

        $this->assertNull(User::find($user->id));
        $this->assertNotNull(User::withTrashed()->find($user->id));
    }
}
