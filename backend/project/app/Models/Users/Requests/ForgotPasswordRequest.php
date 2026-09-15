<?php

namespace App\Models\Users\Requests;

use App\Enums\AuthChannelEnum;
use App\Models\Users\Requests\Concerns\ResolvesChannelInput;
use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a forgot-password (request a reset code) payload.
 */
class ForgotPasswordRequest extends FormRequest
{
    use ResolvesChannelInput;

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
            'email' => ['exclude_if:channel,sms', 'required', 'string', 'email'],
            'mobile_number' => ['exclude_unless:channel,sms', 'required', 'string', 'regex:/^\+639\d{9}$/'],
            'captcha' => [Rule::requiredIf((bool) config('services.turnstile.enabled')), new Turnstile],
        ];
    }
}
