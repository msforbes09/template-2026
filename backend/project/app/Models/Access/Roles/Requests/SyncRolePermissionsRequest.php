<?php

namespace App\Models\Access\Roles\Requests;

use App\Models\Access\Roles\Role;
use App\Rules\GrantablePermissionRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validates the payload for syncing a role's permissions. An administrator may
 * only grant permissions their own session holds — see `GrantablePermissionRule`.
 */
class SyncRolePermissionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => [
                'integer',
                Rule::exists('permissions', 'id')->whereNull('deleted_at'),
                new GrantablePermissionRule,
            ],
        ];
    }

    /**
     * A sync also REMOVES permissions omitted from the list. Stripping a
     * permission you don't hold degrades a peer's role without holding the
     * privilege — so every removed permission must clear the same grantable
     * check as an added one.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $role = $this->route('role');

            if (! $role instanceof Role) {
                return;
            }

            $requested = array_map('intval', (array) $this->input('permission_ids', []));
            $removed = $role->permissions->pluck('id')->reject(fn ($id): bool => in_array((int) $id, $requested, true));
            $rule = new GrantablePermissionRule;

            foreach ($removed as $permissionId) {
                $rule->validate('permission_ids', (string) $permissionId, fn (string $message) => $validator->errors()->add('permission_ids', $message));
            }
        });
    }
}
