<?php

namespace Tests\Feature\Security;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * nginx runs `real_ip_header CF-Connecting-IP`, which rewrites $remote_addr to
 * the resolved client. A bare `include fastcgi_params` would then hand PHP that
 * rewritten value as REMOTE_ADDR — and because App\Http\TrustedProxies trusts
 * the immediate peer (REMOTE_ADDR), Symfony would walk X-Forwarded-For PAST the
 * real client and honour an attacker-supplied prefix, defeating every IP-keyed
 * rate limiter and forging the IP in four log stores.
 *
 * The fix pins REMOTE_ADDR to $realip_remote_addr — the ORIGINAL peer before the
 * real_ip rewrite — so PHP sees the genuine internal hop, the peer-trust token
 * stays honest, and the XFF walk stops at the true client. These tests guard the
 * directive in both the production and dev nginx configs so it can't regress.
 */
class NginxRealIpTest extends TestCase
{
    /**
     * The production and dev nginx configs whose PHP location block must pin
     * REMOTE_ADDR.
     *
     * @return array<string, array{0: string}>
     */
    public static function nginxConfigs(): array
    {
        return [
            'production' => ['../ops/docker/nginx/default.conf'],
            'dev' => ['../ops/docker/nginx/default.dev.conf'],
        ];
    }

    /**
     * Each config pins REMOTE_ADDR to the pre-rewrite peer so the trusted-proxy
     * walk can never be fed the client as its immediate peer.
     */
    #[DataProvider('nginxConfigs')]
    public function test_fastcgi_remote_addr_is_pinned_to_the_real_peer(string $relativePath): void
    {
        $path = base_path($relativePath);
        $this->assertFileExists($path);

        $contents = (string) file_get_contents($path);

        $this->assertMatchesRegularExpression(
            '/fastcgi_param\s+REMOTE_ADDR\s+\$realip_remote_addr\s*;/',
            $contents,
            "Expected {$relativePath} to pin REMOTE_ADDR to \$realip_remote_addr in the PHP location block.",
        );
    }
}
