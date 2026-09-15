<?php

namespace Tests\Feature\Administrators;

use App\Enums\FileEnum;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests that an administrator's photo_uuid resolves to a presigned URL on the private R2 disk.
 */
class AdministratorPhotoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake the private R2 disk so profile photos resolve to presigned URLs.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(File::PRIVATE_DISK);
    }

    /**
     * The profile exposes photo_uuid and a resolved signed photo_url.
     */
    public function test_profile_resolves_photo_uuid_to_signed_url(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);
        $admin = Administrator::factory()->create(['photo_uuid' => $file->uuid, 'with_temporary_password' => false]);
        Sanctum::actingAs($admin, ['*'], 'administrators');

        $this->getJson('/api/v1/administrator/profile')
            ->assertOk()
            ->assertJsonPath('data.photo.uuid', $file->uuid)
            ->assertJsonPath('data.photo.url', fn ($url) => str_contains((string) $url, '?expiration='));
    }

    /**
     * A null photo_uuid resolves to a null photo_url.
     */
    public function test_null_photo_uuid_resolves_to_null_url(): void
    {
        $admin = Administrator::factory()->create(['photo_uuid' => null, 'with_temporary_password' => false]);
        Sanctum::actingAs($admin, ['*'], 'administrators');

        $this->getJson('/api/v1/administrator/profile')
            ->assertOk()
            ->assertJsonPath('data.photo', null);
    }

    /**
     * is_developer is cast to a boolean and defaults to false.
     */
    public function test_is_developer_defaults_false(): void
    {
        $this->assertFalse(Administrator::factory()->create()->is_developer);
    }
}
