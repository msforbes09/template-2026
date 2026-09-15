<?php

namespace App\Services\Security;

/**
 * Decides whether a URL is safe to fetch server-side, and yields an IP-pinned
 * target plus fetch options that keep it safe through the actual request.
 *
 * A naive "resolve, validate, then fetch" leaks in three ways, so the defence has
 * three matching parts:
 *
 *  - Only `https`, and EVERY resolved address — both A (IPv4) and AAAA (IPv6) —
 *    must be public. A host cannot hide a private AAAA behind a public A record,
 *    and an IPv4-mapped IPv6 (e.g. `::ffff:169.254.169.254`) is unwrapped so a
 *    private v4 tunnelled through v6 can't slip past.
 *  - The validated IP is PINNED for the fetch (`CURLOPT_RESOLVE`), so the HTTP
 *    client cannot re-resolve to a different address between this check and the
 *    connect — closing the DNS-rebinding TOCTOU window.
 *  - Redirects are disabled, so a validated URL cannot 3xx to an internal host
 *    that was never checked.
 */
class SsrfGuard
{
    /**
     * True only for an https:// URL whose host resolves entirely to public IPs.
     */
    public static function isPubliclyFetchable(?string $url): bool
    {
        return static::safeTarget($url) !== null;
    }

    /**
     * A validated, IP-pinned fetch target for an https URL whose host resolves
     * entirely to public IPs, or null. The returned `ip` is the exact address the
     * caller must connect to (pin it) so no re-resolution can occur.
     *
     * @return array{host: string, ip: string, port: int}|null
     */
    public static function safeTarget(?string $url): ?array
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $parts = parse_url($url);

        if (($parts['scheme'] ?? null) !== 'https' || empty($parts['host'])) {
            return null;
        }

        $host = $parts['host'];
        $port = (int) ($parts['port'] ?? 443);

        $ips = static::resolveAll($host);

        if ($ips === []) {
            return null; // unresolvable → refuse rather than risk it
        }

        foreach ($ips as $ip) {
            if (! static::isPublicIp($ip)) {
                return null; // any private/reserved A or AAAA fails the whole host
            }
        }

        // All resolved addresses are public, so pinning the first is safe.
        return ['host' => $host, 'ip' => $ips[0], 'port' => $port];
    }

    /**
     * Guzzle/cURL options that pin the fetch to the validated IP and stop it
     * following redirects to an unvalidated host.
     *
     * @param  array{host: string, ip: string, port: int}  $target
     * @return array<string, mixed>
     */
    public static function pinnedHttpOptions(array $target): array
    {
        return [
            'allow_redirects' => false,
            'curl' => [
                CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$target['ip']}"],
            ],
        ];
    }

    /**
     * True if the IP is a public, routable address. IPv4-mapped/compatible IPv6
     * addresses are unwrapped to their embedded IPv4 first.
     */
    public static function isPublicIp(string $ip): bool
    {
        $embedded = static::embeddedIpv4($ip);

        if ($embedded !== null) {
            $ip = $embedded;
        }

        // filter_var returns false for private (RFC1918, ULA fc00::/7) and reserved
        // (loopback, link-local incl. 169.254.169.254 / fe80::, unspecified, etc.)
        // ranges across both families.
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    /**
     * Every IPv4 (A) and IPv6 (AAAA) address a host resolves to; an IP literal
     * resolves to itself.
     *
     * @return list<string>
     */
    protected static function resolveAll(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }

        $ips = gethostbynamel($host) ?: [];

        foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $record) {
            if (! empty($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }

        return array_values(array_unique($ips));
    }

    /**
     * The IPv4 embedded in an IPv4-mapped (`::ffff:a.b.c.d`) or IPv4-compatible
     * (`::a.b.c.d`) IPv6 address, or null if the input isn't one of those.
     */
    protected static function embeddedIpv4(string $ip): ?string
    {
        $packed = @inet_pton($ip);

        if ($packed === false || strlen($packed) !== 16) {
            return null;
        }

        $prefix = substr($packed, 0, 12);
        $mapped = str_repeat("\0", 10)."\xff\xff"; // ::ffff:0:0/96
        $compat = str_repeat("\0", 12);            // ::/96 (IPv4-compatible, deprecated)

        if ($prefix !== $mapped && $prefix !== $compat) {
            return null;
        }

        $v4 = inet_ntop(substr($packed, 12));

        return $v4 === false ? null : $v4;
    }
}
