<?php

namespace App\Models\Administrators\Requests;

use App\Models\Administrators\Administrator;
use App\Rules\NotRecentlyUsedPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validates the administrator change-password payload.
 */
class ChangePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'current_password:administrators'],
            'new_password' => [
                'required',
                'confirmed',
                'different:current_password',
                Password::min(8)->mixedCase()->numbers()->symbols(),
                new NotRecentlyUsedPassword(Administrator::authenticated()),
            ],
        ];
    }
}
