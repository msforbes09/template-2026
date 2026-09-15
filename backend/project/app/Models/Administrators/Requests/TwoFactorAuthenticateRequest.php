<?php

namespace App\Models\Administrators\Requests;

use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the two-factor completion payload.
 */
class TwoFactorAuthenticateRequest extends FormRequest
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
            'auth_token' => ['required', 'string'],
            'pin' => ['required', 'string'],
            'captcha' => [Rule::requiredIf((bool) config('services.turnstile.enabled')), new Turnstile],
        ];
    }
}
