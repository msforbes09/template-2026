<?php

namespace App\Models\Misc\Files\Requests;

use App\Enums\FileEnum;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a file upload payload — images only, up to the configured size cap.
 */
class UploadFileRequest extends FormRequest
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
            'file' => ['required', 'file', 'max:'.FileEnum::MAX_SIZE_KB, 'mimetypes:'.implode(',', FileEnum::MIME_TYPES['images'])],
        ];
    }

    /**
     * Reject files whose raw bytes contain executable/script signatures.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->hasFile('file')) {
                return;
            }

            $contents = (string) file_get_contents($this->file('file')->getRealPath());

            foreach (FileEnum::THREATS as $threat) {
                if (stripos($contents, $threat) !== false) {
                    // Don't name the matched signature — that would hand an attacker a
                    // scanner oracle. Guide a legitimate user to retry with another file.
                    $validator->errors()->add('file', 'The file failed a security check. Please try uploading a different file.');

                    return;
                }
            }
        });
    }
}
