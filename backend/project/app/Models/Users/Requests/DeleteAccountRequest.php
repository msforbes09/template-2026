<?php

namespace App\Models\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the authenticated user's account-deletion payload — the current
 * password must be re-entered (web/password accounts only).
 */
class DeleteAccountRequest extends FormRequest
{
    /**
     * The route is auth-gated; nothing extra here.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'current_password:users'],
        ];
    }

    /**
     * Custom messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.current_password' => 'The password is incorrect.',
        ];
    }
}
