<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * An empty REDIS_SCHEME must read as "no scheme". Laravel's phpredis connector
 * treats any set scheme, including '', as one to prefix onto the host, which
 * turns `host.docker.internal` into `://host.docker.internal` and a blank
 * hostname lookup. The env template ships the key empty, so the config has to
 * normalise it.
 */
class RedisSchemeTest extends TestCase
{
    /**
     * Load config/database.php with REDIS_SCHEME set to the given value.
     */
    private function schemeFor(?string $value): mixed
    {
        $previous = getenv('REDIS_SCHEME');
        $value === null ? putenv('REDIS_SCHEME') : putenv("REDIS_SCHEME={$value}");
        $_ENV['REDIS_SCHEME'] = $value;
        $_SERVER['REDIS_SCHEME'] = $value;

        try {
            return (require base_path('config/database.php'))['redis']['default']['scheme'];
        } finally {
            $previous === false ? putenv('REDIS_SCHEME') : putenv("REDIS_SCHEME={$previous}");
            unset($_ENV['REDIS_SCHEME'], $_SERVER['REDIS_SCHEME']);
        }
    }

    /**
     * Empty and absent both mean plain TCP; an explicit value is kept.
     */
    public function test_empty_scheme_reads_as_null(): void
    {
        $this->assertNull($this->schemeFor(''));
        $this->assertNull($this->schemeFor(null));
        $this->assertSame('tls', $this->schemeFor('tls'));
    }
}
