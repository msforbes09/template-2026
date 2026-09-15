<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * Guards the shape of the two Cloudflare R2 disks: both ride the S3 driver
 * against the R2 endpoint, the private disk carries the presigned-URL TTL,
 * and the public disk carries the custom-domain base URL.
 */
class R2DisksConfigTest extends TestCase
{
    /**
     * Both R2 disks use the S3 driver with R2's required addressing.
     */
    public function test_both_r2_disks_use_the_s3_driver_against_r2(): void
    {
        foreach (['r2', 'r2-public'] as $disk) {
            $this->assertSame('s3', config("filesystems.disks.{$disk}.driver"), $disk);
            $this->assertSame('auto', config("filesystems.disks.{$disk}.region"), $disk);
            $this->assertTrue(config("filesystems.disks.{$disk}.use_path_style_endpoint"), $disk);
            $this->assertSame('uploads', config("filesystems.disks.{$disk}.folder"), $disk);
        }
    }

    /**
     * The private disk carries the presigned URL TTL; the public disk carries the public base URL key.
     */
    public function test_private_ttl_and_public_url_keys_exist(): void
    {
        $this->assertSame(10800, config('filesystems.disks.r2.private_url_ttl'));
        $this->assertArrayHasKey('url', config('filesystems.disks.r2-public'));
        $this->assertArrayNotHasKey('s3', config('filesystems.disks'));
    }
}
