<?php

namespace App\Http\Middleware;

use App\Exceptions\PasswordExpiredException;
use App\Exceptions\TemporaryPasswordException;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block administrators who still hold a temporary password, or whose password
 * has expired with no postponements left, from any route that requires a
 * current password (self-service routes omit this middleware).
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
        $administrator = Administrator::authenticated();

        if ($administrator?->with_temporary_password) {
            throw new TemporaryPasswordException;
        }

        if ($administrator?->isPasswordExpired() && $administrator->passwordExpiryWaivesRemaining() === 0) {
            throw new PasswordExpiredException;
        }

        return $next($request);
    }
}
