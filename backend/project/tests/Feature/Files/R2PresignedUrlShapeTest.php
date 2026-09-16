<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Proves the real (non-faked) S3 presigner produces the URL shape R2 expects:
 * every existing private-URL assertion elsewhere rides Storage::fake()'s stub
 * builder, which never exercises the actual SigV4 signing path. Presigning a
 * URL is a pure, offline computation (no network call), so this test needs no
 * live R2 credentials — only config values shaped like real ones.
 */
class R2PresignedUrlShapeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * signedUrl() against the real S3 driver produces an R2-shaped presigned URL.
     */
    public function test_signed_url_has_the_real_presigned_shape(): void
    {
        config([
            'filesystems.disks.r2.key' => 'test-key',
            'filesystems.disks.r2.secret' => 'test-secret',
            'filesystems.disks.r2.bucket' => 'test-private-bucket',
            'filesystems.disks.r2.endpoint' => 'https://account.r2.cloudflarestorage.com',
        ]);
        Storage::forgetDisk(File::PRIVATE_DISK);

        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);

        $url = $file->signedUrl();

        $this->assertStringStartsWith('https://account.r2.cloudflarestorage.com/test-private-bucket/uploads/', $url);
        $this->assertStringContainsString('X-Amz-Signature=', $url);
        $this->assertStringContainsString('%2Fauto%2Fs3%2Faws4_request', $url);
    }
}
