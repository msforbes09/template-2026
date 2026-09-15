<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use OwenIt\Auditing\Models\Audit as BaseAudit;
use Tests\TestCase;

/**
 * Tests the UploadsFiles concern on Administrator.
 */
class UploadsFilesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Uploading via an administrator associates the owner.
     */
    public function test_admin_upload_associates_owner(): void
    {
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config(['filesystems.disks.r2.folder' => 'uploads', 'filesystems.disks.r2-public.folder' => 'uploads', 'filesystems.disks.r2-public.url' => 'https://cdn.test']);
        $admin = Administrator::factory()->create();

        $file = $admin->uploadFile(UploadedFile::fake()->image('a.jpg'), FileEnum::VISIBILITY['PUBLIC']);

        $this->assertSame('Administrator', $file->owner_type);
        $this->assertSame($admin->id, $file->owner_id);
    }

    /**
     * The owner is bound during create, so only one (created) audit is written.
     */
    public function test_upload_writes_a_single_audit_record(): void
    {
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config(['filesystems.disks.r2.folder' => 'uploads', 'filesystems.disks.r2-public.folder' => 'uploads', 'filesystems.disks.r2-public.url' => 'https://cdn.test']);
        $admin = Administrator::factory()->create();
        BaseAudit::$auditingGloballyDisabled = false;

        $file = $admin->uploadFile(UploadedFile::fake()->image('a.jpg'), FileEnum::VISIBILITY['PUBLIC']);

        $audits = Audit::query()->where('auditable_type', 'File')->where('auditable_id', $file->id)->get();
        $this->assertCount(1, $audits);
        $this->assertSame('created', $audits->first()->event);
    }
}
