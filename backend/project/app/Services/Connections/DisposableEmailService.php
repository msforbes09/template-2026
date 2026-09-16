<?php

namespace App\Services\Connections;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Fetches (and caches) a disposable-email domain blocklist, and checks
 * addresses against it. The outbound fetch is logged via ConnectionService;
 * validation reads only the cache.
 */
class DisposableEmailService extends ConnectionService
{
    /**
     * Log type identifier for this integration.
     */
    protected string $type = 'disposable_emails';

    /**
     * Cache key holding the domain blocklist.
     */
    public const CACHE_KEY = 'disposable_domains';

    /**
     * Fetch the newline-delimited blocklist and cache it (lowercased). A short
     * response (a failed/empty fetch) is ignored so it can't wipe the list.
     */
    public function cacheDomains(): void
    {
        $response = $this->request('GET', (string) config('connection.disposable_emails.access_url'));

        $domains = array_values(array_filter(array_map(
            fn (string $line) => strtolower(trim($line)),
            explode("\n", (string) ($response['raw'] ?? '')),
        )));

        if (count($domains) > 2) {
            Cache::forever(self::CACHE_KEY, $domains);
        }
    }

    /**
     * Whether the email's domain is on the cached blocklist (subdomain-aware,
     * case-insensitive).
     */
    public function isDisposable(string $email): bool
    {
        if (! str_contains($email, '@')) {
            return false;
        }

        $domain = strtolower(Str::afterLast($email, '@'));

        foreach ((array) Cache::get(self::CACHE_KEY, []) as $blocked) {
            if ($domain === $blocked || str_ends_with($domain, '.'.$blocked)) {
                return true;
            }
        }

        return false;
    }
}
