<?php

namespace App\Models\Users\Requests;

use App\Enums\AuthChannelEnum;
use App\Models\Users\Requests\Concerns\ResolvesChannelInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates confirmation of a contact channel being added (identifier + OTP).
 */
class VerifyContactRequest extends FormRequest
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
            'email' => ['exclude_if:channel,sms', 'required', 'string', 'email', 'max:255'],
            'mobile_number' => ['exclude_unless:channel,sms', 'required', 'string', 'regex:/^\+639\d{9}$/'],
            'otp' => ['required', 'string'],
        ];
    }
}
