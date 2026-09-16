<?php

namespace App\Rules;

use App\Models\Concerns\HasPasswordHistory;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;

/**
 * Rejects a new password the account has held within its history window
 * (`auth.password_policy.history_limit`, current password included).
 *
 * Takes the owner explicitly because the account is resolved differently per
 * endpoint: the authenticated principal on a change, the address on a reset.
 * A null owner (unknown address on a reset) passes — existence is the reset
 * flow's own concern and must not leak through validation.
 */
class NotRecentlyUsedPassword implements ValidationRule
{
    /**
     * @param  (Model&HasPasswordHistory)|null  $owner
     */
    public function __construct(private readonly ?Model $owner) {}

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->owner === null || ! is_string($value)) {
            return;
        }

        if ($this->owner->hasRecentlyUsedPassword($value)) {
            $fail('You have used this password recently. Please choose a different one.');
        }
    }
}
