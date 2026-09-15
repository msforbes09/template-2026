<?php

namespace App\Models\Administrators\Requests;

use App\Models\Administrators\Administrator;
use App\Rules\OwnedFileRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates payloads for updating an administrator.
 *
 * `email` is deliberately absent from the rules, so it never reaches `validated()` and
 * is silently discarded — exactly as `is_active` is on this endpoint.
 *
 * It was an account-takeover primitive: a manager could point a colleague's address at
 * one they controlled, trigger that colleague's password reset, and collect the
 * temporary password from their own inbox. Note that this sidesteps the
 * no-privilege-amplification rule entirely — nothing is *granted* to the attacker, so
 * that rule never fires; they simply become someone who already holds the permissions
 * they were after.
 *
 * Discarded rather than rejected so a client echoing the record back unchanged (the usual
 * edit-form shape) keeps working. The cost is a silent no-op for a manager who genuinely
 * meant to change an address: they get a 200 and nothing happens. There is no API path to
 * change an administrator's email — see TODO.md.
 */
class UpdateAdministratorRequest extends FormRequest
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
        $photoRules = ['sometimes', 'required', 'string', 'exists:files,uuid'];

        // Ownership is enforced only when the photo is actually being CHANGED.
        // Re-submitting the target's current photo_uuid (the usual edit-form echo)
        // is a no-op and must not require the editor to own a file that whoever
        // created the target uploaded. This does not reopen the IDOR: an unchanged
        // photo is one the target already exposes, so nothing new is disclosed.
        $target = $this->route('administrator');

        if (! $target instanceof Administrator || $this->input('photo_uuid') !== $target->photo_uuid) {
            $photoRules[] = new OwnedFileRule;
        }

        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'photo_uuid' => $photoRules,
        ];
    }
}
