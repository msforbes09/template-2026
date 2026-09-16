<?php

namespace App\Models\Contents\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates content creation.
 */
class StoreContentRequest extends FormRequest
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
            'identifier' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_-]+$/', Rule::unique('contents', 'identifier')->whereNull('deleted_at')],
            'body' => ['required', 'array'],
            'meta' => ['nullable', 'array'],
        ];
    }
}
