<?php

namespace App\Models\Users\Requests;

use App\Rules\OwnedFileRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a self-service profile-photo change (any account status). Only the
 * photo reaches the model, so nothing else can be set through this endpoint.
 */
class UpdateProfilePhotoRequest extends FormRequest
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
        // Ownership is enforced only when the photo actually CHANGES — the
        // seeded default avatar is a private file the user doesn't own, so
        // re-submitting the unchanged uuid (edit-form echo) must pass. Same
        // guard as the old profile-update rule this endpoint replaced.
        $photoRules = ['nullable', 'string', 'exists:files,uuid'];

        if ($this->input('photo_uuid') !== $this->user('users')?->photo_uuid) {
            $photoRules[] = new OwnedFileRule;
        }

        return ['photo_uuid' => $photoRules];
    }
}
