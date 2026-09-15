<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests the File model's upload + public URL behaviour.
 */
class FileModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Configure a faked s3 disk and cloudfront settings.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        config([
            'filesystems.disks.s3.folder' => 'uploads',
            'filesystems.disks.s3.cloudfront.url' => 'https://cdn.test',
            'filesystems.disks.s3.cloudfront.ttl' => 10800,
        ]);
    }

    /**
     * Uploading a public file streams it to s3 and resolves a permanent CloudFront URL.
     */
    public function test_public_upload_stores_and_builds_permanent_url(): void
    {
        $file = (new File)->uploadFromFile(UploadedFile::fake()->image('photo.jpg'), FileEnum::VISIBILITY['PUBLIC']);

        $this->assertSame(FileEnum::STATUS['UPLOADED'], $file->status);
        $this->assertNotEmpty($file->uuid);
        Storage::disk('s3')->assertExists("public/uploads/{$file->uploaded_name}");

        $this->assertSame("https://cdn.test/public/uploads/{$file->uploaded_name}", $file->url());
    }
}
