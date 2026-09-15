<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Hides the API documentation UI (and its JSON) wherever it is not wanted — production,
 * by default.
 *
 * The docs cannot simply be put behind `auth:administrators`: Swagger UI is a page a
 * browser navigates to, and a browser cannot present a Sanctum bearer token. That would
 * lock everyone out rather than secure anything. So the surface is removed instead.
 *
 * A 404 rather than a 403, so a probe cannot even confirm the docs exist here.
 */
class EnsureDocumentationEnabled
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.docs_enabled')) {
            throw new NotFoundHttpException;
        }

        return $next($request);
    }
}
