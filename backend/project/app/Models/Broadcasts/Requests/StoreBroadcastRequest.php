<?php

namespace App\Models\Broadcasts\Requests;

use App\Enums\UserStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates an admin broadcast: title + body required; targeting is EITHER a
 * single `user_uuid` (which must resolve to a registered user) OR the
 * `status` filter (none = all registered users) — never both.
 */
class StoreBroadcastRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:1000'],
            'user_uuid' => [
                'sometimes', 'required', 'uuid',
                'prohibits:status',
                Rule::exists('users', 'uuid')->whereNull('deleted_at'),
            ],
            'status' => ['sometimes', 'required', Rule::enum(UserStatusEnum::class)],
        ];
    }

    /**
     * The targeting filters exactly as given (empty = all registered users).
     *
     * @return array<string, string>
     */
    public function filters(): array
    {
        return array_filter($this->only(['user_uuid', 'status']));
    }
}
