<?php

namespace App\Http\Middleware;

use App\Exceptions\AuthenticationException;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Slide an administrator token's expiry forward on each authenticated request, so
 * tokens expire only after a period of inactivity — but never past an absolute
 * ceiling measured from when the token was issued.
 *
 * Without that ceiling the sliding window has no end: a stolen token stays alive for
 * as long as it keeps being used, which is exactly what an attacker in possession of
 * one would do. Activity should extend a session, not renew it forever.
 */
class RefreshAdministratorToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken && $token->exists) {
            $this->assertWithinAbsoluteLifetime($token);

            $minutes = (int) config('auth.administrators.token_inactivity_minutes', 60);
            $token->forceFill(['expires_at' => now()->addMinutes($minutes)])->save();
        }

        return $next($request);
    }

    /**
     * Kill a token that has outlived its absolute lifetime, however active it is.
     */
    private function assertWithinAbsoluteLifetime(PersonalAccessToken $token): void
    {
        $maxMinutes = (int) config('auth.administrators.token_absolute_minutes', 480);

        // copy() matters: Carbon is mutable, and the caller saves this model straight
        // afterwards — mutating created_at here would persist a token whose birth date
        // marches forward on every request, so the ceiling could never be reached.
        if ($token->created_at?->copy()->addMinutes($maxMinutes)->isPast()) {
            $token->delete();

            throw new AuthenticationException;
        }
    }
}
