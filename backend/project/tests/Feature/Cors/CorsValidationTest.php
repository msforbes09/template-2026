<?php

namespace Tests\Feature\Cors;

use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * CORS is validated against the configured origin allowlist by the HandleCors
 * middleware: allowed origins are reflected back, others are not.
 */
class CorsValidationTest extends TestCase
{
    /**
     * Send a CORS preflight for the given origin against an api/* route.
     */
    private function preflight(string $origin): TestResponse
    {
        return $this->call('OPTIONS', '/api/v1/administrator/authenticate', [], [], [], [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);
    }

    /**
     * An origin on the configured allowlist is reflected in Access-Control-Allow-Origin.
     */
    public function test_allowed_origin_is_reflected(): void
    {
        config(['cors.allowed_origins' => ['https://admin.example.com']]);

        $this->preflight('https://admin.example.com')
            ->assertHeader('Access-Control-Allow-Origin', 'https://admin.example.com');
    }

    /**
     * An origin NOT on the allowlist is never reflected — Access-Control-Allow-Origin
     * comes back as a different (allowed) origin, so the browser blocks the response.
     */
    public function test_disallowed_origin_is_not_reflected(): void
    {
        config(['cors.allowed_origins' => ['https://admin.example.com']]);

        $allowOrigin = $this->preflight('https://evil.example.com')
            ->headers->get('Access-Control-Allow-Origin');

        $this->assertNotSame('https://evil.example.com', $allowOrigin);
    }

    /**
     * Local dev origins are allowed out of the box (strict default, no env set).
     */
    public function test_local_dev_origin_allowed_by_default(): void
    {
        $this->assertContains('http://localhost:5173', config('cors.allowed_origins'));

        $this->preflight('http://localhost:5173')
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    /**
     * Credentials are not permitted (bearer-token API, no cookies).
     */
    public function test_credentials_not_supported(): void
    {
        $this->assertFalse(config('cors.supports_credentials'));
    }
}
