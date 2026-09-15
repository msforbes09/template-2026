<?php

namespace Tests\Feature\Captcha;

use App\Rules\Turnstile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Tests the Turnstile validation rule.
 */
class TurnstileRuleTest extends TestCase
{
    /**
     * Whether validating the given data against the rule fails.
     *
     * @param  array<string, mixed>  $data
     */
    private function fails(array $data): bool
    {
        return Validator::make($data, ['captcha' => [new Turnstile]])->fails();
    }

    /**
     * When disabled, the rule passes and makes no HTTP call.
     */
    public function test_disabled_passes_without_http(): void
    {
        config(['services.turnstile.enabled' => false]);
        Http::fake();

        $this->assertFalse($this->fails(['captcha' => 'anything']));
        Http::assertNothingSent();
    }

    /**
     * When enabled, a token Cloudflare accepts passes.
     */
    public function test_enabled_valid_token_passes(): void
    {
        config(['services.turnstile.enabled' => true, 'services.turnstile.verify_url' => 'https://cf.test/v']);
        Http::fake(['cf.test/*' => Http::response(['success' => true])]);

        $this->assertFalse($this->fails(['captcha' => 'good']));
    }

    /**
     * When enabled, a token Cloudflare rejects fails.
     */
    public function test_enabled_invalid_token_fails(): void
    {
        config(['services.turnstile.enabled' => true, 'services.turnstile.verify_url' => 'https://cf.test/v']);
        Http::fake(['cf.test/*' => Http::response(['success' => false])]);

        $this->assertTrue($this->fails(['captcha' => 'bad']));
    }
}
