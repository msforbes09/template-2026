<?php

namespace App\Models\Users\Resources;

use App\Models\Misc\Files\Resources\FileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Admin-facing user representation (uuid, never the internal id).
 */
#[OA\Schema(
    schema: 'User',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string', example: '01931f2e-7b3a-73c4-9a1e-2f6b0c8d4e10'),
        new OA\Property(property: 'email', type: 'string', nullable: true, example: 'user@example.com'),
        new OA\Property(property: 'first_name', type: 'string', nullable: true, example: 'Alex'),
        new OA\Property(property: 'middle_name', type: 'string', nullable: true, example: 'Lee'),
        new OA\Property(property: 'last_name', type: 'string', nullable: true, example: 'Rivera'),
        new OA\Property(property: 'suffix_name', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'company_name', type: 'string', nullable: true, example: 'Acme Corp'),
        new OA\Property(property: 'display_name', type: 'string', example: 'Alex Rivera'),
        new OA\Property(property: 'mobile_number', type: 'string', nullable: true, example: '+639170000000'),
        new OA\Property(property: 'birth_date', type: 'string', nullable: true, example: '1990-01-01'),
        new OA\Property(property: 'gender', type: 'string', nullable: true, example: 'male'),
        new OA\Property(property: 'citizenship', type: 'object', nullable: true, description: 'Included on show only (omitted from the list).', example: ['code' => 'PH', 'name' => 'Philippines']),
        new OA\Property(property: 'address', ref: '#/components/schemas/UserAddress', description: 'Included on show only (omitted from the list).'),
        new OA\Property(property: 'photo', ref: '#/components/schemas/File', nullable: true),
        new OA\Property(property: 'status', type: 'string', nullable: true, description: 'Lifecycle status: draft | completed', example: 'completed'),
        new OA\Property(property: 'profile_completed_at', type: 'string', nullable: true, example: '2026-08-21 10:12:45'),
        new OA\Property(property: 'authentication_channel', type: 'string', nullable: true, description: 'Channel of the last token issued: email | sms.', example: 'email'),
        new OA\Property(property: 'is_active', type: 'integer', enum: [0, 1], example: 1),
        new OA\Property(property: 'last_login_at', type: 'string', nullable: true, example: '2026-07-07 10:30:00'),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-07-07 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', example: '2026-07-07 10:30:00'),
    ],
)]
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'email' => $this->email,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix_name' => $this->suffix_name,
            'company_name' => $this->company_name,
            'display_name' => $this->display_name,
            'mobile_number' => $this->mobile_number,
            'birth_date' => $this->birth_date,
            'gender' => $this->gender,
            // citizenship + address are resolved on show only (relations eager-loaded there, not in the list).
            'citizenship' => $this->when($this->relationLoaded('citizenship'), fn () => $this->citizenship ? ['code' => $this->citizenship->code, 'name' => $this->citizenship->name] : null),
            'address' => $this->when($this->relationLoaded('country'), fn () => $this->addressArray()),
            'photo' => $this->photo ? FileResource::make($this->photo) : null,
            'status' => $this->status,
            'profile_completed_at' => $this->profile_completed_at?->format('Y-m-d H:i:s'),
            'authentication_channel' => $this->authentication_channel,
            'is_active' => (int) $this->is_active,
            'last_login_at' => $this->last_login_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
