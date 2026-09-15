<?php

namespace App\Services\Files;

use Aws\CloudFront\CloudFrontClient;

/**
 * Produces CloudFront key-pair signed URLs.
 */
class CloudFrontSigner
{
    /**
     * Sign a CloudFront URL, valid for the given number of seconds.
     */
    public function sign(string $url, int $ttlSeconds): string
    {
        return (new CloudFrontClient([
            'region' => (string) config('filesystems.disks.s3.region'),
            'version' => 'latest',
        ]))->getSignedUrl([
            'url' => $url,
            'expires' => now()->addSeconds($ttlSeconds)->timestamp,
            'private_key' => config('filesystems.disks.s3.cloudfront.private_key'),
            'key_pair_id' => config('filesystems.disks.s3.cloudfront.key_pair_id'),
        ]);
    }
}
