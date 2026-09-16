<?php

namespace App\Rules;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects a file UUID the acting principal (administrator or user) does not own.
 *
 * A file UUID is a direct object reference and the resource hands back a
 * presigned URL for whatever file it points at. Validating only that the UUID
 * exists let anyone link a private file uploaded by someone else — another admin's
 * upload, another user's photo — as their own and read it back. Ownership is
 * therefore checked here, with public files exempt (they are served by permanent,
 * unsigned URL to everyone anyway, so there is nothing to leak).
 */
class OwnedFileRule implements ValidationRule
{
    /**
     * Run the validation rule against a file UUID.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $file = File::query()->where('uuid', $value)->first();

        if ($file === null) {
            return; // Existence is another rule's job.
        }

        if ($file->visibility === FileEnum::VISIBILITY['PUBLIC']) {
            return; // Public files carry no privacy concern.
        }

        // Whichever guard authenticated this request — admin endpoints run on the
        // administrators guard, self-service user endpoints on the users guard.
        $actor = request()->user('administrators') ?? request()->user('users');

        // Compared as strings, not ints: the owner models use integer keys today,
        // but casting to int would silently collapse any future string/UUID key to
        // 0 — turning the check into 0 === 0 and matching every file. String
        // comparison is correct for both key types.
        if ($actor !== null
            && $file->owner_type === $actor->getMorphClass()
            && (string) $file->owner_id === (string) $actor->getKey()) {
            return;
        }

        $fail('The selected :attribute is invalid.');
    }
}
