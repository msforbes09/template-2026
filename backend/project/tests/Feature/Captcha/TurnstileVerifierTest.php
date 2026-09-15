<?php

namespace Tests\Feature\Captcha;

use App\Services\Captcha\TurnstileVerifier;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests the Cloudflare Turnstile verifier.
 */
class TurnstileVerifierTest extends TestCase
{
    /**
     * Set a known secret + verify URL for the tests.
     */
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.turnstile.secret' => 'test-secret',
            'services.turnstile.verify_url' => 'https://cf.test/siteverify',
        ]);
    }

    /**
     * A success response from Cloudflare returns true and sends secret + response.
     */
    public function test_valid_token_returns_true(): void
    {
        Http::fake(['cf.test/*' => Http::response(['success' => true])]);

        $this->assertTrue(app(TurnstileVerifier::class)->verify('good-token', '1.2.3.4'));

        Http::assertSent(fn ($request) => $request['secret'] === 'test-secret'
            && $request['response'] === 'good-token'
            && $request['remoteip'] === '1.2.3.4');
    }

    /**
     * A failure response returns false.
     */
    public function test_invalid_token_returns_false(): void
    {
        Http::fake(['cf.test/*' => Http::response(['success' => false])]);

        $this->assertFalse(app(TurnstileVerifier::class)->verify('bad-token'));
    }

    /**
     * A network/connection error fails closed (false).
     */
    public function test_connection_error_fails_closed(): void
    {
        Http::fake(fn () => throw new ConnectionException('down'));

        $this->assertFalse(app(TurnstileVerifier::class)->verify('any-token'));
    }
}
