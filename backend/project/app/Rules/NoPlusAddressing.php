<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;

/**
 * Rejects plus-addressed (sub-addressed) emails — a `+` in the local part
 * (e.g. admin+001@example.com), which all deliver to one inbox and defeat
 * uniqueness. Only the local part is inspected.
 */
class NoPlusAddressing implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && str_contains(Str::before($value, '@'), '+')) {
            $fail('Plus-addressed (sub-addressed) email addresses are not allowed.');
        }
    }
}
