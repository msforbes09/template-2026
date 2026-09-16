<?php

namespace App\Http\Middleware;

use App\Exceptions\TemporaryPasswordException;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block administrators who still hold a temporary password from any route
 * that requires a changed password (self-service routes omit this middleware).
 */
class EnsurePasswordChanged
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Administrator::authenticated()?->with_temporary_password) {
            throw new TemporaryPasswordException;
        }

        return $next($request);
    }
}
