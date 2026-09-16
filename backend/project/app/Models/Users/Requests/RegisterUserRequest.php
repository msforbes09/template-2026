<?php

namespace App\Models\Users\Requests;

use App\Rules\NoDisposableEmailRule;
use App\Rules\NoPlusAddressing;
use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a website self-registration request (email + names + captcha).
 */
class RegisterUserRequest extends FormRequest
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
            // Uniqueness is checked silently in the model (anti-enumeration), not here.
            'email' => ['required', 'string', 'email', 'max:255', new NoPlusAddressing, new NoDisposableEmailRule],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            'captcha' => [Rule::requiredIf((bool) config('services.turnstile.enabled', true)), new Turnstile],
        ];
    }
}
