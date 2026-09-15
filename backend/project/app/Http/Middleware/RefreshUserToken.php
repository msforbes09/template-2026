<?php

namespace App\Http\Middleware;

use App\Exceptions\AuthenticationException;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Slide a user token's expiry forward on each authenticated request, so tokens
 * expire only after a period of inactivity — but never past an absolute ceiling
 * measured from when the token was issued. Without that ceiling a stolen token
 * stays alive for as long as it keeps being used. Mirrors RefreshAdministratorToken.
 */
class RefreshUserToken
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

            $minutes = (int) config('auth.users.token_inactivity_minutes', 60);
            $token->forceFill(['expires_at' => now()->addMinutes($minutes)])->save();
        }

        return $next($request);
    }

    /**
     * Kill a token that has outlived its absolute lifetime, however active it is.
     */
    private function assertWithinAbsoluteLifetime(PersonalAccessToken $token): void
    {
        $maxMinutes = (int) config('auth.users.token_absolute_minutes', 1440);

        // copy() matters: Carbon is mutable and the caller saves the token straight
        // after — mutating created_at here would push the ceiling forward forever.
        if ($token->created_at?->copy()->addMinutes($maxMinutes)->isPast()) {
            $token->delete();

            throw new AuthenticationException;
        }
    }
}
