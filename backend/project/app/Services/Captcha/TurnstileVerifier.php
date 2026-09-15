<?php

namespace App\Services\Captcha;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Verifies Cloudflare Turnstile tokens against the siteverify API.
 */
class TurnstileVerifier
{
    /**
     * Whether the given token is valid. Fails closed on any error.
     */
    public function verify(string $token, ?string $ip = null): bool
    {
        try {
            $response = Http::asForm()->timeout(5)->post(config('services.turnstile.verify_url'), array_filter([
                'secret' => config('services.turnstile.secret'),
                'response' => $token,
                'remoteip' => $ip,
            ]));

            return $response->successful() && $response->json('success') === true;
        } catch (Throwable $e) {
            return false;
        }
    }
}
