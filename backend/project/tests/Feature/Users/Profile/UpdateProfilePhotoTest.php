<?php

namespace Tests\Feature\Users\Profile;

use App\Enums\FileEnum;
use App\Enums\UserStatusEnum;
use App\Models\Misc\Files\File;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The dedicated profile-photo endpoint: a website user can change their
 * photo in ANY status (the rest of the profile stays status-locked), with the
 * same file-ownership guard as everywhere else.
 */
class UpdateProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A website user in the given status.
     */
    private function websiteUser(string $status, string $method = 'website'): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => $status, 'registration_method' => $method, 'is_active' => true,
        ]);
    }

    /**
     * A private file owned by the given user.
     */
    private function ownedFile(User $user): File
    {
        return File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'owner_type' => $user->getMorphClass(), 'owner_id' => $user->getKey(),
        ]);
    }

    /**
     * A completed user can change the photo.
     */
    public function test_completed_user_updates_photo(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        Sanctum::actingAs($user, ['*'], 'users');
        $own = $this->ownedFile($user);

        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $own->uuid])
            ->assertOk()
            ->assertJsonPath('data.photo.uuid', $own->uuid);

        $this->assertSame($own->uuid, $user->fresh()->photo_uuid);
    }

    /**
     * Every other status works too — the endpoint has no status guard.
     */
    public function test_any_status_can_update_photo(): void
    {
        foreach (['draft', 'completed'] as $status) {
            $user = User::create([
                'email' => "u-{$status}@example.com", 'first_name' => 'U', 'last_name' => 'X',
                'status' => $status, 'registration_method' => 'website', 'is_active' => true,
            ]);
            Sanctum::actingAs($user, ['*'], 'users');
            $own = $this->ownedFile($user);

            $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $own->uuid])->assertOk();
            $this->assertSame($own->uuid, $user->fresh()->photo_uuid, "status {$status}");
        }
    }

    /**
     * Someone else's private file is refused — the usual IDOR guard.
     */
    public function test_cannot_reference_foreign_private_file(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        Sanctum::actingAs($user, ['*'], 'users');
        $other = User::create(['email' => 'other@example.com', 'first_name' => 'O', 'last_name' => 'X', 'is_active' => true]);
        $foreign = $this->ownedFile($other);

        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $foreign->uuid])
            ->assertStatus(422)->assertJsonValidationErrors('photo_uuid');
    }

    /**
     * Re-submitting the unchanged (possibly unowned, seeded-default) photo passes —
     * ownership is only enforced on a change.
     */
    public function test_unchanged_photo_echo_passes(): void
    {
        $owner = User::create(['email' => 'seed@example.com', 'first_name' => 'S', 'last_name' => 'A', 'is_active' => true]);
        $default = $this->ownedFile($owner);
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        $user->update(['photo_uuid' => $default->uuid]);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $default->uuid])->assertOk();
    }

    /**
     * Null clears the photo.
     */
    public function test_null_clears_photo(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        $user->update(['photo_uuid' => $this->ownedFile($user)->uuid]);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => null])->assertOk();

        $this->assertNull($user->fresh()->photo_uuid);
    }

    /**
     * Non-website accounts stay locked out (their profile is externally owned).
     */
    public function test_non_website_user_is_forbidden(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value, 'external');
        Sanctum::actingAs($user, ['*'], 'users');

        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => null])
            ->assertStatus(403)->assertJson(['error' => 'profile_not_editable']);
    }
}
