<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests the File model's disk selection, upload, and public URL behaviour.
 */
class FileModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake both R2 disks and pin the folder + public URL.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config([
            'filesystems.disks.r2.folder' => 'uploads',
            'filesystems.disks.r2-public.folder' => 'uploads',
            'filesystems.disks.r2-public.url' => 'https://cdn.test',
        ]);
    }

    /**
     * A public upload lands on the public disk, records that disk, and resolves a plain custom-domain URL.
     */
    public function test_public_upload_stores_on_public_disk_and_builds_permanent_url(): void
    {
        $file = (new File)->uploadFromFile(UploadedFile::fake()->image('photo.jpg'), FileEnum::VISIBILITY['PUBLIC']);

        $this->assertSame(FileEnum::STATUS['UPLOADED'], $file->status);
        $this->assertSame(File::PUBLIC_DISK, $file->disk);
        $this->assertSame('uploads', $file->folder_path);
        Storage::disk(File::PUBLIC_DISK)->assertExists("uploads/{$file->uploaded_name}");
        Storage::disk(File::PRIVATE_DISK)->assertMissing("uploads/{$file->uploaded_name}");

        $this->assertSame("https://cdn.test/uploads/{$file->uploaded_name}", $file->url());
    }

    /**
     * A private upload lands on the private disk only and records that disk.
     */
    public function test_private_upload_stores_on_private_disk(): void
    {
        $file = (new File)->uploadFromFile(UploadedFile::fake()->image('photo.jpg'), FileEnum::VISIBILITY['PRIVATE']);

        $this->assertSame(FileEnum::STATUS['UPLOADED'], $file->status);
        $this->assertSame(File::PRIVATE_DISK, $file->disk);
        Storage::disk(File::PRIVATE_DISK)->assertExists("uploads/{$file->uploaded_name}");
        Storage::disk(File::PUBLIC_DISK)->assertMissing("uploads/{$file->uploaded_name}");
    }

    /**
     * diskFor maps visibility to the matching disk name.
     */
    public function test_disk_for_maps_visibility_to_disk(): void
    {
        $this->assertSame('r2-public', File::diskFor(FileEnum::VISIBILITY['PUBLIC']));
        $this->assertSame('r2', File::diskFor(FileEnum::VISIBILITY['PRIVATE']));
    }
}
