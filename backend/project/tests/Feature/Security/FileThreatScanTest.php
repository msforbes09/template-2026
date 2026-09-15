<?php

namespace Tests\Feature\Security;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The upload threat scan runs over raw bytes, so ultra-short signatures (`<%`,
 * `<?=`) collided with ordinary binary image data and false-rejected legitimate
 * uploads. Those are removed; meaningful (≥5-byte) signatures still block real
 * embedded payloads.
 */
class FileThreatScanTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake s3 + config so uploads don't touch the network.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        config(['filesystems.disks.s3.folder' => 'uploads']);

        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $this->withToken($admin->createToken('t', ['*'])->plainTextToken);
    }

    /**
     * A valid PNG whose bytes happen to contain `<%` (as ~half of real photos do)
     * uploads successfully — the short tag is no longer treated as a threat.
     */
    public function test_image_containing_short_tag_bytes_is_accepted(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC');
        $file = $this->fileWith($png.'<% harmless bytes %> and <?= also', 'photo.png');

        $this->postJson('/api/v1/common/files/public', ['file' => $file])
            ->assertCreated();
    }

    /**
     * A file with a genuine embedded `<?php` payload is still rejected, with a
     * message that guides the user rather than naming the signature.
     */
    public function test_embedded_php_payload_is_still_rejected(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC');
        $file = $this->fileWith($png.'<?php system($_GET[0]); ?>', 'evil.png');

        $response = $this->postJson('/api/v1/common/files/public', ['file' => $file])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertStringNotContainsString('<?php', $response->json('errors.file.0'));
        $this->assertStringContainsString('different file', $response->json('errors.file.0'));
    }

    /**
     * A temp UploadedFile with the given raw contents (in test mode so it isn't
     * treated as an unsafe move).
     */
    private function fileWith(string $contents, string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'threat');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, 'image/png', null, true);
    }
}
