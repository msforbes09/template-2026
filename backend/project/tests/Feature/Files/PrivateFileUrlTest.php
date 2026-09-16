<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests private-file presigned URL resolution + caching on the private R2 disk.
 */
class PrivateFileUrlTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake the private disk and pin the TTL.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(File::PRIVATE_DISK);
        config(['filesystems.disks.r2.private_url_ttl' => 10800]);
    }

    /**
     * A private file resolves to a presigned URL for its object path, valid ttl + 5 minutes.
     */
    public function test_private_file_resolves_to_a_presigned_url(): void
    {
        $this->freezeTime();
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);

        $url = $file->url();

        $this->assertStringContainsString($file->path(), $url);
        $this->assertStringEndsWith('?expiration='.now()->addSeconds(10800 + 300)->timestamp, $url);
    }

    /**
     * The presigned URL is cached for the TTL, so a second resolve does not re-sign.
     */
    public function test_presigned_url_is_cached(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);
        $signCalls = 0;
        Storage::disk(File::PRIVATE_DISK)->buildTemporaryUrlsUsing(function (string $path) use (&$signCalls) {
            $signCalls++;

            return "https://r2.test/{$path}?sig=test";
        });

        $first = $file->signedUrl();
        $second = $file->signedUrl();

        $this->assertSame($first, $second);
        $this->assertSame(1, $signCalls);
        $this->assertTrue(Cache::has(File::CACHE_PREFIX.$file->uuid));
    }

    /**
     * A private file that is not uploaded yet has no URL.
     */
    public function test_unuploaded_private_file_has_no_url(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE'], 'status' => FileEnum::STATUS['FAILED']]);

        $this->assertNull($file->url());
    }

    /**
     * A configured TTL below the floor is clamped to a minimum of 60 seconds.
     */
    public function test_ttl_is_clamped_to_a_minimum(): void
    {
        $this->freezeTime();
        config(['filesystems.disks.r2.private_url_ttl' => 0]);
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);

        $url = $file->url();

        $this->assertStringEndsWith('?expiration='.now()->addSeconds(60 + 300)->timestamp, $url);
    }
}
