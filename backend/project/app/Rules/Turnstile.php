<?php

namespace App\Rules;

use App\Services\Captcha\TurnstileVerifier;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates a Cloudflare Turnstile token, skipping when the feature is disabled.
 */
class Turnstile implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! config('services.turnstile.enabled')) {
            return;
        }

        if (! is_string($value) || $value === '' || ! app(TurnstileVerifier::class)->verify($value, request()->ip())) {
            $fail('Captcha verification failed. Please try again.');
        }
    }
}
