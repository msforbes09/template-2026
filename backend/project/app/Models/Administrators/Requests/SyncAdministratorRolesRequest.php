<?php

namespace App\Models\Administrators\Requests;

use App\Models\Administrators\Administrator;
use App\Rules\GrantableRoleRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validates the payload for syncing an administrator's roles.
 */
class SyncAdministratorRolesRequest extends FormRequest
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
            'role_ids' => ['present', 'array'],
            'role_ids.*' => [
                'integer',
                Rule::exists('roles', 'id')->whereNull('deleted_at'),
                Rule::when(
                    ! Administrator::authenticated()->isSuperAdmin(),
                    [Rule::notIn([Administrator::SUPER_ADMIN_ROLE_ID])],
                ),
                new GrantableRoleRule,
            ],
        ];
    }

    /**
     * A sync also REMOVES roles omitted from the list. Removing a role you could
     * not grant is the same escalation in reverse (a lower-privilege admin could
     * strip a high-privilege peer), so every removed role must clear the same
     * grantable check as an added one.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $target = $this->route('administrator');

            if (! $target instanceof Administrator) {
                return;
            }

            $requested = array_map('intval', (array) $this->input('role_ids', []));
            $removed = $target->roles->pluck('id')->reject(fn ($id): bool => in_array((int) $id, $requested, true));
            $rule = new GrantableRoleRule;

            foreach ($removed as $roleId) {
                $rule->validate('role_ids', (string) $roleId, fn (string $message) => $validator->errors()->add('role_ids', $message));
            }
        });
    }

    /**
     * Human-readable reason for the Super Admin restriction.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role_ids.*.not_in' => 'Only a super administrator may grant the Super Admin role.',
        ];
    }
}
