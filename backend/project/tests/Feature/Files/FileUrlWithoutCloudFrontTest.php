<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CloudFront signing is optional: without a configured key pair, a private
 * file's URL is the plain permanent URL instead of an exception.
 */
class FileUrlWithoutCloudFrontTest extends TestCase
{
    use RefreshDatabase;

    /**
     * With no key pair configured, the signed URL degrades to the permanent URL.
     */
    public function test_private_file_url_falls_back_to_permanent_url_without_key_pair(): void
    {
        config(['filesystems.disks.r2-public.url' => 'https://cdn.example.com']);
        config(['filesystems.disks.s3.cloudfront.key_pair_id' => null]);

        $file = File::factory()->create([
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'status' => FileEnum::STATUS['UPLOADED'],
        ]);

        $this->assertSame($file->permanentUrl(), $file->url());
        $this->assertStringStartsWith('https://cdn.example.com/', $file->url());
    }
}
