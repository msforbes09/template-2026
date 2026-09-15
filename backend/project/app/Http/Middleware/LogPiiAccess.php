<?php

namespace App\Http\Middleware;

use App\Models\Misc\Audits\Audit;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records an audit trail entry whenever an administrator reads user PII.
 *
 * The model-event audit system only fires on writes (created/updated/deleted),
 * so a decrypted profile handed back on a GET left no trace — an insider or a
 * compromised account could enumerate user data unrecorded. This middleware
 * closes that gap for the user-read endpoints: it writes who read, which record
 * (when a single one is bound), and the request's URL, IP and agent.
 *
 * Only successful responses are logged — a 403/404 disclosed nothing. It honours
 * the same `audit.enabled` switch as the rest of the audit system.
 */
class LogPiiAccess
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response->isSuccessful() && config('audit.enabled', true)) {
            $this->record($request);
        }

        return $response;
    }

    /**
     * Write the access audit record.
     */
    protected function record(Request $request): void
    {
        $reader = $request->user('administrators');
        $target = $this->boundModel($request);

        (new Audit)->forceFill([
            'user_type' => $reader?->getMorphClass(),
            'user_id' => $reader?->getKey(),
            'event' => 'accessed',
            'auditable_type' => $target?->getMorphClass(),
            'auditable_id' => $target?->getKey(),
            'old_values' => null,
            'new_values' => null,
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'tags' => 'pii-access',
        ])->save();
    }

    /**
     * The first Eloquent model bound to the route (the record being read), or null
     * for a route with no model parameter.
     */
    protected function boundModel(Request $request): ?Model
    {
        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if ($parameter instanceof Model) {
                return $parameter;
            }
        }

        return null;
    }
}
