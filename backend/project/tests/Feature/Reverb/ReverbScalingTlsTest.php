<?php

namespace Tests\Feature\Reverb;

use Illuminate\Support\Arr;
use Illuminate\Support\ConfigurationUrlParser;
use Tests\TestCase;

/**
 * The Reverb scaling (Redis pub/sub) connection must be able to speak TLS, so a
 * TLS-only managed Redis (Valkey/ElastiCache) doesn't reset the plaintext socket
 * (ECONNRESET) and crash the server. Reverb builds a rediss:// URL only when the
 * scaling server config carries scheme === 'tls'.
 */
class ReverbScalingTlsTest extends TestCase
{
    /**
     * Reproduce Laravel Reverb's RedisClient::redisUrl() protocol resolution.
     *
     * @param  array<string, mixed>  $server
     */
    private function reverbRedisUrl(array $server): string
    {
        $parsed = (new ConfigurationUrlParser)->parseConfiguration($server);
        $driver = strtolower($parsed['driver'] ?? '');

        if (in_array($driver, ['tcp', 'tls'], true)) {
            $parsed['scheme'] = $driver;
        }

        $protocol = Arr::get($parsed, 'scheme') === 'tls' ? 's' : '';

        return "redis{$protocol}://{$parsed['host']}:{$parsed['port']}";
    }

    /**
     * The scaling server config exposes a `scheme` key (the fix — without it the
     * connection is always plaintext).
     */
    public function test_scaling_server_config_exposes_a_scheme(): void
    {
        $this->assertArrayHasKey('scheme', config('reverb.servers.reverb.scaling.server'));
    }

    /**
     * With REDIS_SCHEME=tls the scaling connection resolves to a TLS (rediss://) URL.
     */
    public function test_tls_scheme_resolves_to_a_rediss_url(): void
    {
        $server = array_merge(config('reverb.servers.reverb.scaling.server'), ['url' => null, 'scheme' => 'tls']);

        $this->assertStringStartsWith('rediss://', $this->reverbRedisUrl($server));
    }

    /**
     * Without a TLS scheme it stays plaintext (unchanged for local/non-TLS Redis).
     */
    public function test_no_scheme_stays_plaintext(): void
    {
        $server = array_merge(config('reverb.servers.reverb.scaling.server'), ['url' => null, 'scheme' => null]);

        $this->assertStringStartsWith('redis://', $this->reverbRedisUrl($server));
    }
}
