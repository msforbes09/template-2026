<?php

namespace Tests\Feature\Administrators\Broadcasting;

use Tests\TestCase;

/**
 * Which origins may open a WebSocket to Reverb.
 *
 * `allowed_origins => ['*']` short-circuits Reverb's origin check outright
 * (`Protocols/Pusher/Server::verifyOrigin`), so any site on the internet could open a
 * connection. Private channels stay protected by the signed auth response — a foreign
 * origin cannot read the admin's bearer token — but nothing stopped a stranger holding
 * connections open, or subscribing to a public channel.
 */
class ReverbAllowedOriginsTest extends TestCase
{
    /**
     * Re-evaluate config/reverb.php against a given env value.
     *
     * @return list<string>
     */
    private function originsFor(?string $env): array
    {
        $key = 'REVERB_ALLOWED_ORIGINS';

        if ($env === null) {
            putenv($key);
            unset($_ENV[$key], $_SERVER[$key]);
        } else {
            putenv("{$key}={$env}");
            $_ENV[$key] = $_SERVER[$key] = $env;
        }

        $config = require config_path('reverb.php');

        return $config['apps']['apps'][0]['allowed_origins'];
    }

    /**
     * Reset the env between cases so one test cannot leak into the next.
     */
    protected function tearDown(): void
    {
        putenv('REVERB_ALLOWED_ORIGINS');
        unset($_ENV['REVERB_ALLOWED_ORIGINS'], $_SERVER['REVERB_ALLOWED_ORIGINS']);

        parent::tearDown();
    }

    /**
     * The wildcard must never be the shipped default — it disables the check entirely,
     * and a deployment that forgets to configure origins would be wide open.
     */
    public function test_the_wildcard_is_not_the_default(): void
    {
        $this->assertNotContains('*', $this->originsFor(null));
    }

    /**
     * The default still lets a developer work locally.
     */
    public function test_the_default_allows_local_development(): void
    {
        $origins = $this->originsFor(null);

        $this->assertContains('localhost', $origins);
        $this->assertContains('127.0.0.1', $origins);
    }

    /**
     * A deployment lists its front-end hosts, comma-separated. Reverb matches the host
     * of the Origin header with `Str::is`, so wildcard patterns work.
     */
    public function test_origins_are_read_from_the_environment(): void
    {
        $this->assertSame(
            ['admin.example.com', '*.staging.example.com'],
            $this->originsFor('admin.example.com, *.staging.example.com'),
        );
    }

    /**
     * Stray whitespace and empty entries — the kind a hand-edited `.env` collects — do
     * not become an empty origin that matches nothing, or worse, everything.
     */
    public function test_a_scrappy_env_value_is_cleaned_up(): void
    {
        $this->assertSame(
            ['admin.example.com'],
            $this->originsFor('  admin.example.com ,, '),
        );
    }
}
