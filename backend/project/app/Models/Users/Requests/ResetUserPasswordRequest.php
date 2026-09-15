<?php

namespace App\Models\Users\Requests;

use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Validates a reset-password (OTP + new password) payload.
 */
class ResetUserPasswordRequest extends FormRequest
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
            'email' => ['required', 'string', 'email'],
            'otp' => ['required', 'string'],
            'new_password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            'captcha' => [Rule::requiredIf((bool) config('services.turnstile.enabled')), new Turnstile],
        ];
    }
}
