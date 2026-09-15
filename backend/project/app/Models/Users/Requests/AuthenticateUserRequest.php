<?php

namespace App\Models\Users\Requests;

use App\Enums\AuthChannelEnum;
use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a native user (email + password) login request.
 */
class AuthenticateUserRequest extends FormRequest
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
            'channel' => ['nullable', Rule::enum(AuthChannelEnum::class)],
            'email' => ['exclude_if:channel,sms', 'required', 'email'],
            'mobile_number' => ['exclude_unless:channel,sms', 'required', 'string', 'regex:/^\+639\d{9}$/'],
            'password' => ['required', 'string'],
            'device_token' => ['nullable', 'string'],
            'captcha' => [Rule::requiredIf((bool) config('services.turnstile.enabled')), new Turnstile],
        ];
    }
}
