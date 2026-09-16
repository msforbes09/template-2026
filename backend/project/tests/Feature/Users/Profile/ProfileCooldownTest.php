<?php

namespace Tests\Feature\Users\Profile;

use App\Enums\FileEnum;
use App\Enums\UserStatusEnum;
use App\Models\Addresses\Barangays\Barangay;
use App\Models\Addresses\Countries\Country;
use App\Models\Addresses\Municipalities\Municipality;
use App\Models\Addresses\Provinces\Province;
use App\Models\Addresses\Regions\Region;
use App\Models\Misc\Files\File;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The 30-day profile edit cooldown: free edits in draft, and once completed the
 * details and photo each on their own clock anchored to profile completion —
 * completing starts both clocks, every allowed edit restarts its own. A missing
 * photo can always be set.
 */
class ProfileCooldownTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake the private R2 disk and seed the address reference rows the payload references.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(File::PRIVATE_DISK);

        Country::create(['code' => 'PH', 'name' => 'Philippines', 'nationality' => 'Filipino']);
        Region::create(['code' => 'R1', 'name' => 'NCR']);
        Province::create(['code' => 'P1', 'region_code' => 'R1', 'name' => 'Metro Manila']);
        Municipality::create(['code' => 'M1', 'region_code' => 'R1', 'province_code' => 'P1', 'name' => 'Manila']);
        Barangay::create(['code' => 'B1', 'region_code' => 'R1', 'province_code' => 'P1', 'municipality_code' => 'M1', 'name' => 'Barangay 1']);
    }

    /**
     * A website user in the given status with a completed profile.
     */
    private function websiteUser(string $status, array $extra = []): User
    {
        return User::create([
            'email' => fake()->unique()->safeEmail(), 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'password' => 'Secret@123', 'email_verified_at' => now(),
            'company_name' => 'Acme', 'citizenship_code' => 'PH', 'region_code' => 'R1',
            'province_code' => 'P1', 'municipality_code' => 'M1', 'barangay_code' => 'B1',
            'address_line_one' => '123 Main St.',
            'registration_method' => 'website', 'is_active' => true,
            'status' => $status,
            'profile_completed_at' => $status === UserStatusEnum::DRAFT->value ? null : now(),
            ...$extra,
        ]);
    }

    /**
     * A private file owned by the given user.
     */
    private function fileFor(User $user): File
    {
        return File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'owner_type' => $user->getMorphClass(), 'owner_id' => $user->getKey(),
        ]);
    }

    /**
     * The full valid profile payload (PUT replaces the document).
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme',
            'citizenship_code' => 'PH', 'region_code' => 'R1', 'province_code' => 'P1',
            'municipality_code' => 'M1', 'barangay_code' => 'B1', 'address_line_one' => '123 Main St.',
        ], $overrides);
    }

    /**
     * Draft edits stay free — repeated updates, no clock, no cooldown.
     */
    public function test_draft_edits_free(): void
    {
        $user = $this->websiteUser(UserStatusEnum::DRAFT->value);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload(['first_name' => 'Pedro']))->assertOk();
        $this->putJson('/api/v1/user/profile', $this->payload(['first_name' => 'Morgan']))->assertOk();

        $this->assertNull($user->fresh()->details_changed_at);
    }

    /**
     * After completion the first edit must wait out the 30 days from the stamp;
     * an allowed edit restarts the clock.
     */
    public function test_completed_details_cooldown(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->putJson('/api/v1/user/profile', $this->payload(['first_name' => 'Pedro']))
            ->assertStatus(400)
            ->assertJson(['error' => 'profile_change_cooldown'])
            ->assertJsonPath('meta.next_change_at', fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $v) === 1);

        // The window opens at the START of the lapse day, not the exact hour.
        $this->travelTo(now()->addDays(30)->startOfDay()->addHour());
        $this->putJson('/api/v1/user/profile', $this->payload(['first_name' => 'Pedro']))->assertOk();
        $this->assertNotNull($user->fresh()->details_changed_at);

        $this->putJson('/api/v1/user/profile', $this->payload(['first_name' => 'Juanito']))
            ->assertStatus(400)->assertJson(['error' => 'profile_change_cooldown']);
    }

    /**
     * Photo: setting a first photo is always free; changing it is clock-bound;
     * draft users change freely.
     */
    public function test_photo_cooldown(): void
    {
        $user = $this->websiteUser(UserStatusEnum::COMPLETED->value);
        Sanctum::actingAs($user, ['*'], 'users');

        // No photo attached -> free, even inside the cooldown window.
        $first = $this->fileFor($user);
        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $first->uuid])->assertOk();

        // Changing it now is clock-bound.
        $second = $this->fileFor($user);
        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $second->uuid])
            ->assertStatus(400)->assertJson(['error' => 'profile_change_cooldown']);

        $this->travel(31)->days();
        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $second->uuid])->assertOk();

        // Draft users are always free.
        $draft = $this->websiteUser(UserStatusEnum::DRAFT->value);
        Sanctum::actingAs($draft, ['*'], 'users');
        $file = $this->fileFor($draft);
        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => $file->uuid])->assertOk();
        $this->patchJson('/api/v1/user/profile/photo', ['photo_uuid' => null])->assertOk();
    }
}
