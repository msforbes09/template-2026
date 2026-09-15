<?php

namespace Tests\Feature\Galleries;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use App\Models\Misc\Galleries\Gallery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests the Gallery module: public-image upload/list/delete and permission gates.
 */
class GalleryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an administrator with the given token abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    /**
     * Uploading stores the object under the gallery folder and records its path;
     * url() builds the public R2 URL from the path.
     */
    public function test_upload_stores_under_public_gallery_and_builds_url(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        config(['filesystems.disks.r2-public.url' => 'https://cdn.example.com']);

        $gallery = Gallery::upload(UploadedFile::fake()->image('pic.jpg'));

        $this->assertSame('gallery', $gallery->folder_path);
        $this->assertStringEndsWith('.jpg', $gallery->uploaded_name);
        $this->assertSame('pic.jpg', $gallery->original_name);
        Storage::disk(File::PUBLIC_DISK)->assertExists("{$gallery->folder_path}/{$gallery->uploaded_name}");
        $this->assertSame("https://cdn.example.com/{$gallery->folder_path}/{$gallery->uploaded_name}", $gallery->url());
    }

    /**
     * Deleting a gallery removes its R2 object and its record.
     */
    public function test_delete_removes_s3_object_and_record(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        $gallery = Gallery::upload(UploadedFile::fake()->image('pic.jpg'));
        $object = "{$gallery->folder_path}/{$gallery->uploaded_name}";
        Storage::disk(File::PUBLIC_DISK)->assertExists($object);

        $gallery->delete();

        Storage::disk(File::PUBLIC_DISK)->assertMissing($object);
        $this->assertDatabaseMissing('galleries', ['id' => $gallery->id]);
    }

    /**
     * List returns galleries to an admin with gallery-view.
     */
    public function test_list_returns_galleries(): void
    {
        Gallery::factory()->count(2)->create();
        $this->actingWith(['gallery-view']);

        $this->getJson('/api/v1/administrator/galleries')
            ->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'original_name', 'url']]]);
    }

    /**
     * Create uploads an image and returns 201.
     */
    public function test_create_uploads_image(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        $this->actingWith(['gallery-view', 'gallery-manage']);

        $this->postJson('/api/v1/administrator/galleries', ['file' => UploadedFile::fake()->image('pic.jpg')])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['uuid', 'original_name', 'url']]);

        $this->assertDatabaseCount('galleries', 1);
    }

    /**
     * Create rejects non-image uploads (same validation as File).
     */
    public function test_create_rejects_non_image(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        $this->actingWith(['gallery-view', 'gallery-manage']);

        $this->postJson('/api/v1/administrator/galleries', ['file' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    /**
     * Delete removes the gallery (bound by uuid).
     */
    public function test_delete_endpoint_removes_gallery(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        $gallery = Gallery::upload(UploadedFile::fake()->image('pic.jpg'));
        $this->actingWith(['gallery-view', 'gallery-manage']);

        $this->deleteJson("/api/v1/administrator/galleries/{$gallery->uuid}")->assertOk();

        $this->assertDatabaseMissing('galleries', ['id' => $gallery->id]);
    }

    /**
     * Create requires the gallery-manage permission.
     */
    public function test_create_requires_manage_permission(): void
    {
        Storage::fake(File::PUBLIC_DISK);
        $this->actingWith(['gallery-view']);

        $this->postJson('/api/v1/administrator/galleries', ['file' => UploadedFile::fake()->image('pic.jpg')])
            ->assertStatus(403);
    }

    /**
     * List requires the gallery-view permission.
     */
    public function test_list_requires_view_permission(): void
    {
        $this->actingWith([]);

        $this->getJson('/api/v1/administrator/galleries')->assertStatus(403);
    }

    /**
     * The endpoints require authentication.
     */
    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/administrator/galleries')->assertUnauthorized();
    }

    /**
     * Any authenticated admin can list galleries via the common endpoint — no
     * permission required.
     */
    public function test_common_list_for_any_authenticated_admin(): void
    {
        Gallery::factory()->count(2)->create();
        $this->actingWith([]);   // authenticated, no abilities

        $this->getJson('/api/v1/common/galleries')
            ->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'original_name', 'url']]]);
    }

    /**
     * The common endpoint still requires authentication.
     */
    public function test_common_list_requires_authentication(): void
    {
        $this->getJson('/api/v1/common/galleries')->assertUnauthorized();
    }
}
