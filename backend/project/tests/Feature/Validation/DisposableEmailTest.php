<?php

namespace Tests\Feature\Validation;

use App\Rules\NoDisposableEmailRule;
use App\Services\Connections\DisposableEmailService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Tests the disposable-email service, cache command, and validation rule.
 */
class DisposableEmailTest extends TestCase
{
    /**
     * The blocklist URL used by the service.
     */
    private function fakeList(string $body): void
    {
        config(['connection.disposable_emails.access_url' => 'https://blocklist.test/domains.conf']);
        Http::fake(['blocklist.test/*' => Http::response($body, 200)]);
    }

    /**
     * cacheDomains fetches and caches the newline-delimited list (lowercased).
     */
    public function test_cache_domains_stores_the_list(): void
    {
        $this->fakeList("Mailinator.com\nguerrillamail.com\n10minutemail.com\n");

        (new DisposableEmailService)->cacheDomains();

        $this->assertSame(['mailinator.com', 'guerrillamail.com', '10minutemail.com'], Cache::get('disposable_domains'));
    }

    /**
     * A too-short (failed) fetch does not overwrite an existing cached list.
     */
    public function test_short_fetch_does_not_overwrite(): void
    {
        Cache::forever('disposable_domains', ['mailinator.com', 'guerrillamail.com']);
        $this->fakeList('');

        (new DisposableEmailService)->cacheDomains();

        $this->assertSame(['mailinator.com', 'guerrillamail.com'], Cache::get('disposable_domains'));
    }

    /**
     * isDisposable matches exact domain, subdomains, and is case-insensitive.
     */
    public function test_is_disposable_matching(): void
    {
        Cache::forever('disposable_domains', ['mailinator.com']);
        $service = new DisposableEmailService;

        $this->assertTrue($service->isDisposable('a@mailinator.com'));
        $this->assertTrue($service->isDisposable('a@sub.mailinator.com'));
        $this->assertTrue($service->isDisposable('a@MAILINATOR.com'));
        $this->assertFalse($service->isDisposable('a@gmail.com'));
    }

    /**
     * The rule rejects disposable and passes clean addresses.
     */
    public function test_rule_rejects_disposable(): void
    {
        Cache::forever('disposable_domains', ['mailinator.com']);

        $this->assertFalse(Validator::make(['email' => 'a@mailinator.com'], ['email' => [new NoDisposableEmailRule]])->passes());
        $this->assertTrue(Validator::make(['email' => 'a@gmail.com'], ['email' => [new NoDisposableEmailRule]])->passes());
    }

    /**
     * The toggle disables the rule entirely.
     */
    public function test_rule_toggle_off(): void
    {
        Cache::forever('disposable_domains', ['mailinator.com']);
        config(['connection.disposable_emails.enabled' => false]);

        $this->assertTrue(Validator::make(['email' => 'a@mailinator.com'], ['email' => [new NoDisposableEmailRule]])->passes());
    }

    /**
     * The scheduled cache command runs the service.
     */
    public function test_cache_command(): void
    {
        $this->fakeList("mailinator.com\nguerrillamail.com\n10minutemail.com\n");

        $this->artisan('email:cache-disposable-domains')->assertSuccessful();

        $this->assertcontainsDomains();
    }

    /**
     * Assert the cached list is populated.
     */
    private function assertcontainsDomains(): void
    {
        $this->assertContains('mailinator.com', Cache::get('disposable_domains', []));
    }
}
