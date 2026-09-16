<?php

namespace App\Rules;

use App\Models\Access\Permissions\Permission;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects a permission the acting administrator's own session does not hold.
 *
 * You cannot give away what you do not have. Without this, `roles-manage` is a
 * blank cheque: an admin mints a role carrying every permission, assigns it, and
 * escalates — never touching the Super Admin role that the other guards seal.
 *
 * Keyed on the session's token abilities rather than the database, matching the
 * `abilities:` middleware that gates every other endpoint.
 */
class GrantablePermissionRule implements ValidationRule
{
    /**
     * Run the validation rule against a permission id.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $name = Permission::query()->whereKey($value)->value('name');

        if ($name === null) {
            return; // Existence is another rule's job.
        }

        if (! Administrator::authenticated()->tokenCan($name)) {
            $fail('You cannot grant the :input permission, because your own session does not hold it.');
        }
    }
}
