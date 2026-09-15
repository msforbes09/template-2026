<?php

namespace Tests\Feature\Security;

use App\Enums\FileEnum;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A file UUID is a direct object reference. Referencing one as an administrator
 * photo must be confined to files the admin owns (or public files), and the
 * upload endpoint itself must be rate-limited so it cannot be used to exhaust
 * storage.
 */
class FileAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake s3 so uploads don't touch the network.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        config(['filesystems.disks.s3.folder' => 'uploads']);
    }

    /**
     * Act as an admin holding administrators-manage, returning the actor.
     */
    private function actingManager(): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, ['administrators-view', 'administrators-manage'], 'administrators');

        return $admin;
    }

    /**
     * A private file owned by the given administrator.
     */
    private function privateFileOwnedBy(Administrator $owner): File
    {
        return File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'owner_type' => $owner->getMorphClass(),
            'owner_id' => $owner->getKey(),
        ]);
    }

    /**
     * Updating an administrator while re-sending their EXISTING photo (uploaded by
     * whoever created them) succeeds even though the editor doesn't own that file —
     * an unchanged photo is a no-op echo and discloses nothing new.
     */
    public function test_update_accepts_unchanged_foreign_photo(): void
    {
        $this->actingManager();
        $creator = Administrator::factory()->create();
        $photo = $this->privateFileOwnedBy($creator);
        $target = Administrator::factory()->create(['photo_uuid' => $photo->uuid]);

        $this->putJson("/api/v1/administrator/administrators/{$target->id}", [
            'first_name' => 'Renamed',
            'photo_uuid' => $photo->uuid, // unchanged
        ])->assertOk();

        $this->assertSame('Renamed', $target->fresh()->first_name);
    }

    /**
     * But CHANGING the photo to a different file the editor doesn't own is still
     * rejected — that is the IDOR the ownership rule exists to stop.
     */
    public function test_update_rejects_changing_to_an_unowned_photo(): void
    {
        $this->actingManager();
        $target = Administrator::factory()->create([
            'photo_uuid' => $this->privateFileOwnedBy(Administrator::factory()->create())->uuid,
        ]);
        $foreign = $this->privateFileOwnedBy(Administrator::factory()->create());

        $this->putJson("/api/v1/administrator/administrators/{$target->id}", [
            'photo_uuid' => $foreign->uuid, // changed to another admin's file
        ])->assertStatus(422)->assertJsonValidationErrors('photo_uuid');
    }

    /**
     * An admin cannot attach a private file owned by someone else (IDOR).
     */
    public function test_cannot_reference_another_admins_private_file(): void
    {
        $actor = $this->actingManager();
        $other = Administrator::factory()->create();
        $foreign = $this->privateFileOwnedBy($other);

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'new@example.com',
            'first_name' => 'New',
            'last_name' => 'Admin',
            'photo_uuid' => $foreign->uuid,
        ])->assertStatus(422)->assertJsonValidationErrors('photo_uuid');
    }

    /**
     * An admin CAN attach a private file they own.
     */
    public function test_can_reference_own_private_file(): void
    {
        $actor = $this->actingManager();
        $own = $this->privateFileOwnedBy($actor);

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'new@example.com',
            'first_name' => 'New',
            'last_name' => 'Admin',
            'photo_uuid' => $own->uuid,
        ])->assertCreated();
    }

    /**
     * A public file carries no privacy concern, so any admin may reference it.
     */
    public function test_can_reference_a_public_file_owned_by_anyone(): void
    {
        $this->actingManager();
        $other = Administrator::factory()->create();
        $public = File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PUBLIC'],
            'owner_type' => $other->getMorphClass(),
            'owner_id' => $other->getKey(),
        ]);

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'new@example.com',
            'first_name' => 'New',
            'last_name' => 'Admin',
            'photo_uuid' => $public->uuid,
        ])->assertCreated();
    }

    /**
     * The upload endpoint is throttled per authenticated principal, so it cannot
     * be hammered to fill storage.
     */
    public function test_upload_is_rate_limited(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $this->withToken($admin->createToken('t', ['*'])->plainTextToken);

        for ($i = 0; $i < 30; $i++) {
            $response = $this->postJson('/api/v1/common/files/public', ['file' => UploadedFile::fake()->image("a{$i}.jpg")]);
            if ($response->status() === 429) {
                $this->assertTrue(true);

                return;
            }
        }

        $this->fail('Upload endpoint was never throttled after 30 rapid requests.');
    }
}
