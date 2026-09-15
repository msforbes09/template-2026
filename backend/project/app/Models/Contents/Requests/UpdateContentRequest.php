<?php

namespace App\Models\Contents\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates content updates.
 */
class UpdateContentRequest extends FormRequest
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
        $id = $this->route('content')?->id;

        return [
            'identifier' => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[a-z0-9_-]+$/', Rule::unique('contents', 'identifier')->ignore($id)->whereNull('deleted_at')],
            'body' => ['sometimes', 'required', 'array'],
            'meta' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
