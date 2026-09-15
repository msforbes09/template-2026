<?php

namespace App\Rules;

use App\Services\Connections\DisposableEmailService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects emails whose domain is on the cached disposable-email blocklist,
 * skipping when the feature is disabled.
 */
class NoDisposableEmailRule implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! config('connection.disposable_emails.enabled', true)) {
            return;
        }

        if (is_string($value) && app(DisposableEmailService::class)->isDisposable($value)) {
            $fail('Disposable email addresses are not allowed.');
        }
    }
}
