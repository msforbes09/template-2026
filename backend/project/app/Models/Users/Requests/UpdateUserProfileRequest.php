<?php

namespace App\Models\Users\Requests;

use App\Enums\GenderEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a self-service profile update. Only these keys reach the model, so
 * privilege fields (status/is_active/email/registration_method) can never be set.
 */
class UpdateUserProfileRequest extends FormRequest
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
        // The photo is NOT part of this payload — it moved to its own endpoint
        // (PATCH /profile/photo, UpdateProfilePhotoRequest) so it stays
        // editable in any status. A submitted photo_uuid is simply ignored,
        // like the privilege fields.
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'suffix_name' => ['nullable', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            // A plain contact field — not an auth identifier, never verified.
            'mobile_number' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::enum(GenderEnum::class)],
            'citizenship_code' => ['required', 'string', 'exists:countries,code'],
            'region_code' => ['required', 'string', 'exists:regions,code'],
            'province_code' => ['required', 'string', 'exists:provinces,code'],
            'municipality_code' => ['required', 'string', 'exists:municipalities,code'],
            'barangay_code' => ['required', 'string', 'exists:barangays,code'],
            'address_line_one' => ['required', 'string', 'max:255'],
            'address_line_two' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
        ];
    }
}
