<?php

namespace App\Models\Administrators\Requests;

use App\Rules\NoDisposableEmailRule;
use App\Rules\NoPlusAddressing;
use App\Rules\OwnedFileRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates payloads for creating an administrator.
 */
class StoreAdministratorRequest extends FormRequest
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
            'email' => ['required', 'email', new NoPlusAddressing, new NoDisposableEmailRule, Rule::unique('administrators', 'email')->whereNull('deleted_at')],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'photo_uuid' => ['required', 'string', 'exists:files,uuid', new OwnedFileRule],
        ];
    }
}
