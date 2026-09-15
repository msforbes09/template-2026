<?php

namespace App\Http\Middleware;

use App\Exceptions\ServiceUnavailableException;
use App\Services\FeatureFlags\FeatureFlags;
use Closure;
use Illuminate\Http\Request;

/**
 * Maintenance-mode gate, driven by the `maintenance_mode` runtime feature flag.
 *
 * Two modes: `maintenance` (hard — every request answers 503 while the flag is
 * on) and `maintenance:admin` (the admin surface — 503 unless the authenticated
 * administrator is flagged `is_developer`, so developer admins keep working and
 * can switch maintenance back off).
 */
class EnsureNotInMaintenance
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ?string $mode = null): mixed
    {
        if (! app(FeatureFlags::class)->enabled('maintenance_mode')) {
            return $next($request);
        }

        if ($mode === 'admin' && $request->user('administrators')?->is_developer) {
            return $next($request);
        }

        throw new ServiceUnavailableException;
    }
}
