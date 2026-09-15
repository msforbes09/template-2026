<?php

namespace App\Http;

/**
 * The hops a request legitimately passes through before reaching PHP-FPM, so
 * `$request->ip()` can walk X-Forwarded-For back to the real caller.
 *
 * In production the chain is Cloudflare → AWS load balancer (VPC 10.x) → Docker
 * NAT (172.x bridge) → nginx → FPM. REMOTE_ADDR is therefore always an internal
 * hop, and every log type (gateway, connection, audit, auth-attempt) and every
 * IP-keyed rate limiter reads `$request->ip()` — without this list they all
 * attribute every request to the Docker gateway.
 *
 * The immediate peer is trusted unconditionally (`REMOTE_ADDR`): through Docker
 * NAT, PHP only ever sees the bridge gateway, whose subnet is whatever the host
 * daemon's address pool hands out (172.20.x on one host, 172.80.x on another —
 * not reliably inside RFC1918's 172.16/12). Enumerating it per host is a guess;
 * the honest model is "the hop in front of me is my own infrastructure". The
 * walk beyond that still only continues through the listed ranges (VPC and
 * Cloudflare's published ranges, https://www.cloudflare.com/ips/), so a forged
 * prefix in front of an untrusted relay is not honoured.
 *
 * This token is only safe because nginx pins `fastcgi_param REMOTE_ADDR
 * $realip_remote_addr` (the ORIGINAL peer, before `real_ip_header
 * CF-Connecting-IP` rewrites $remote_addr to the client). Without that pin PHP
 * would see the resolved CLIENT as REMOTE_ADDR, this token would trust it, and
 * Symfony would walk X-Forwarded-For past the real caller and honour a forged
 * prefix. Keep the nginx pin and this token in lockstep (see NginxRealIpTest).
 *
 * Residual risk, unchanged from before: traffic that reaches the origin
 * bypassing Cloudflare can set X-Forwarded-For itself. That is closed at the
 * network layer (origin/LB accepts Cloudflare only), not here.
 *
 * Mirrors the `set_real_ip_from` list in ops/docker/nginx/nginx.conf; keep the
 * two in sync.
 */
final class TrustedProxies
{
    /**
     * CIDR ranges Laravel may trust X-Forwarded-* headers from.
     *
     * @return list<string>
     */
    public static function ranges(): array
    {
        return [
            // The immediate peer — the Docker bridge gateway, whatever subnet
            // this host's daemon assigned it. Laravel substitutes the request's
            // own REMOTE_ADDR for this token.
            'REMOTE_ADDR',
            // Internal hops behind it: VPC / load balancer and RFC1918 bridges.
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            // Cloudflare IPv4
            '173.245.48.0/20',
            '103.21.244.0/22',
            '103.22.200.0/22',
            '103.31.4.0/22',
            '141.101.64.0/18',
            '108.162.192.0/18',
            '190.93.240.0/20',
            '188.114.96.0/20',
            '197.234.240.0/22',
            '198.41.128.0/17',
            '162.158.0.0/15',
            '104.16.0.0/13',
            '104.24.0.0/14',
            '172.64.0.0/13',
            '131.0.72.0/22',
            // Cloudflare IPv6
            '2400:cb00::/32',
            '2606:4700::/32',
            '2803:f800::/32',
            '2405:b500::/32',
            '2405:8100::/32',
            '2a06:98c0::/29',
            '2c0f:f248::/32',
        ];
    }
}
