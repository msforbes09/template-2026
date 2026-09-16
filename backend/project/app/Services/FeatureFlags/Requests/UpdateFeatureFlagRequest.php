<?php

namespace App\Services\FeatureFlags\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a feature-flag toggle: the desired enabled state.
 */
class UpdateFeatureFlagRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
        ];
    }
}
