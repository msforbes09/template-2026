<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use App\Services\Files\CloudFrontSigner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Tests private-file signed URL resolution + caching.
 */
class PrivateFileUrlTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Number of times the stub signer was invoked.
     */
    public int $signCalls = 0;

    /**
     * Bind a deterministic signer stub and set cloudfront config.
     */
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'filesystems.disks.s3.cloudfront.url' => 'https://cdn.test', 'filesystems.disks.s3.cloudfront.key_pair_id' => 'TESTKEY',
            'filesystems.disks.s3.cloudfront.ttl' => 10800,
        ]);
        $this->app->bind(CloudFrontSigner::class, function () {
            return new class($this) extends CloudFrontSigner
            {
                public function __construct(private PrivateFileUrlTest $test) {}

                public function sign(string $url, int $ttlSeconds): string
                {
                    $this->test->signCalls++;

                    return $url.'?sig=test';
                }
            };
        });
    }

    /**
     * A private file resolves to a signed URL and caches it (no re-sign).
     */
    public function test_private_file_signed_and_cached(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);

        $url = $file->signedUrl();

        $this->assertStringEndsWith('?sig=test', $url);
        $this->assertTrue(Cache::has(File::CACHE_PREFIX.$file->uuid));

        $file->signedUrl();
        $this->assertSame(1, $this->signCalls);
    }
}
