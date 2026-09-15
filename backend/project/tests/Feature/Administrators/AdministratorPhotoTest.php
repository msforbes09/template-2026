<?php

namespace Tests\Feature\Administrators;

use App\Enums\FileEnum;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use App\Services\Files\CloudFrontSigner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests that an administrator's photo_uuid resolves to a signed CloudFront URL.
 */
class AdministratorPhotoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Stub the CloudFront signer + cloudfront config.
     */
    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.disks.s3.cloudfront.url' => 'https://cdn.test', 'filesystems.disks.s3.cloudfront.key_pair_id' => 'TESTKEY', 'filesystems.disks.s3.cloudfront.ttl' => 10800]);
        $this->app->bind(CloudFrontSigner::class, fn () => new class extends CloudFrontSigner
        {
            public function sign(string $url, int $ttlSeconds): string
            {
                return $url.'?sig=test';
            }
        });
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
            ->assertJsonPath('data.photo.url', fn ($url) => str_ends_with((string) $url, '?sig=test'));
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
