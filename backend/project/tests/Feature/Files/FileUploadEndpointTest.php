<?php

namespace Tests\Feature\Files;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests the file upload endpoints.
 */
class FileUploadEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake both R2 disks.
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
     * Authenticate an admin with a bearer token.
     *
     * Their temporary password must already be changed: the upload routes carry
     * `password.changed`, so an admin who has not finished setting up their account is
     * refused. See ConfigHardeningTest.
     */
    private function actingAsAdmin(): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $this->withToken($admin->createToken('t', ['*'])->plainTextToken);

        return $admin;
    }

    /**
     * Public upload returns uuid + permanent url and stores the object.
     */
    public function test_public_upload(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/common/files/public', ['file' => UploadedFile::fake()->image('a.jpg')]);

        $response->assertCreated()->assertJsonStructure(['data' => ['uuid', 'url', 'mime_type', 'size']]);
        $this->assertStringContainsString('https://cdn.test/uploads/', $response->json('data.url'));
    }

    /**
     * Private upload returns a presigned url.
     */
    public function test_private_upload_is_presigned(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/common/files/private', ['file' => UploadedFile::fake()->image('a.jpg')])
            ->assertCreated()->assertJsonPath('data.url', fn ($url) => str_contains($url, '?expiration='));
    }

    /**
     * An authenticated user (user guard) can also upload, and owns the File.
     */
    public function test_a_user_can_upload_and_owns_the_file(): void
    {
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'email_verified_at' => now(), 'is_active' => true,
        ]);
        $this->withToken($user->createToken('t', ['*'])->plainTextToken);

        $this->postJson('/api/v1/common/files/private', ['file' => UploadedFile::fake()->image('a.jpg')])
            ->assertCreated()->assertJsonStructure(['data' => ['uuid', 'url']]);

        $this->assertDatabaseHas('files', ['owner_type' => 'User', 'owner_id' => $user->id]);
    }

    /**
     * Upload requires authentication.
     */
    public function test_upload_requires_auth(): void
    {
        $this->postJson('/api/v1/common/files/public', ['file' => UploadedFile::fake()->image('a.jpg')])->assertStatus(401);
    }

    /**
     * A disallowed mime type is rejected with 422.
     */
    public function test_disallowed_mime_is_rejected(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/common/files/public', ['file' => UploadedFile::fake()->create('x.exe', 10, 'application/x-msdownload')])
            ->assertStatus(422)->assertJsonValidationErrors('file');
    }
}
