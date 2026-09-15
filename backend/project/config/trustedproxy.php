<?php

use App\Http\TrustedProxies;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Trusted proxies
|--------------------------------------------------------------------------
|
| Read by Laravel's TrustProxies middleware on every request. `$request->ip()`
| walks X-Forwarded-For back through these hops, so every log type (gateway,
| connection, audit, auth-attempt) and every IP-keyed rate limiter attributes
| a request to the real caller rather than to the Docker gateway or the
| Next.js UI server.
|
| The baked-in list (App\Http\TrustedProxies) covers the immediate peer, the
| VPC and Cloudflare. TRUSTED_PROXIES appends per-environment hops that are
| not knowable in code — chiefly the UI server's egress IP(s), since it calls
| the API on the browser's behalf from server actions and forwards the human's
| address in X-Forwarded-For. Comma-separated IPs or CIDRs, e.g.
| TRUSTED_PROXIES=198.51.100.7 — the real value lives only in that
| environment's .env, never in the repo.
|
*/

$extra = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('TRUSTED_PROXIES', '')),
)));

return [

    'proxies' => [...TrustedProxies::ranges(), ...$extra],

    'headers' => Request::HEADER_X_FORWARDED_FOR
        | Request::HEADER_X_FORWARDED_HOST
        | Request::HEADER_X_FORWARDED_PORT
        | Request::HEADER_X_FORWARDED_PROTO,

];
