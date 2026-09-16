<?php

namespace App\Models\Documentations\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates documentation creation.
 */
class StoreDocumentationRequest extends FormRequest
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
            'identifier' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_-]+$/', Rule::unique('documentations', 'identifier')->whereNull('deleted_at')],
            'body' => ['required', 'array'],
            'meta' => ['nullable', 'array'],
        ];
    }
}
