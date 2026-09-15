<?php

namespace App\Rules;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects a role carrying permissions the acting administrator's session lacks.
 *
 * The counterpart to `GrantablePermissionRule`: sealing which permissions you can
 * put *into* a role achieves nothing if you can still hand out an existing role
 * that is more powerful than you are.
 */
class GrantableRoleRule implements ValidationRule
{
    /**
     * Run the validation rule against a role id.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $role = Role::query()->with('permissions')->find($value);

        if ($role === null) {
            return; // Existence is another rule's job.
        }

        $administrator = Administrator::authenticated();

        $beyond = $role->permissions
            ->pluck('name')
            ->reject(fn (string $permission): bool => $administrator->tokenCan($permission));

        if ($beyond->isNotEmpty()) {
            $fail("You cannot grant the \"{$role->name}\" role, because it carries permissions your own session does not hold: {$beyond->implode(', ')}.");
        }
    }
}
