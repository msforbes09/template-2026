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
 * Only for AUTHENTICATED change requests, where the owner is the principal. The
 * reset path checks reuse inside resetPasswordWithOtp() after the OTP has been
 * verified, so an unauthenticated caller can never probe an address's passwords.
 */
class NotRecentlyUsedPassword implements ValidationRule
{
    /**
     * The field message, shared with the post-verification check on a reset.
     */
    public const MESSAGE = 'You have used this password recently. Please choose a different one.';

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
            $fail(self::MESSAGE);
        }
    }
}
