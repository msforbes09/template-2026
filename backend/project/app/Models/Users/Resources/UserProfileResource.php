<?php

namespace App\Models\Users\Resources;

use App\Models\Misc\Files\Resources\FileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The resolved user address — each geographic level as `{code, name}` (or null),
 * plus the free-text lines and postal code. Shared by the profile + admin views.
 */
#[OA\Schema(
    schema: 'UserAddress',
    type: 'object',
    properties: [
        new OA\Property(property: 'country', type: 'object', nullable: true, example: ['code' => 'PH', 'name' => 'Philippines']),
        new OA\Property(property: 'region', type: 'object', nullable: true, example: ['code' => '1300000000', 'name' => 'National Capital Region (NCR)']),
        new OA\Property(property: 'province', type: 'object', nullable: true, example: null),
        new OA\Property(property: 'municipality', type: 'object', nullable: true, example: ['code' => '1380600000', 'name' => 'City of Manila']),
        new OA\Property(property: 'barangay', type: 'object', nullable: true, example: ['code' => '1380601001', 'name' => 'Barangay 1']),
        new OA\Property(property: 'line_one', type: 'string', nullable: true, example: '123 Main St.'),
        new OA\Property(property: 'line_two', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'postal_code', type: 'string', nullable: true, example: '1000'),
    ],
)]
/**
 * The authenticated user's own profile (never exposes the internal id).
 */
#[OA\Schema(
    schema: 'UserProfile',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string', description: 'Public id — also the private broadcast channel key (`private-user.{uuid}`).', example: '01931f2e-7b3a-73c4-9a1e-2f6b0c8d4e10'),
        new OA\Property(property: 'email', type: 'string', nullable: true, example: 'user@example.com'),
        new OA\Property(property: 'first_name', type: 'string', nullable: true, example: 'Alex'),
        new OA\Property(property: 'middle_name', type: 'string', nullable: true, example: 'Lee'),
        new OA\Property(property: 'last_name', type: 'string', nullable: true, example: 'Rivera'),
        new OA\Property(property: 'suffix_name', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'company_name', type: 'string', nullable: true, example: 'Acme Corp'),
        new OA\Property(property: 'display_name', type: 'string', example: 'Alex Rivera Jr.'),
        new OA\Property(property: 'mobile_number', type: 'string', nullable: true, example: '+639170000000'),
        new OA\Property(property: 'birth_date', type: 'string', nullable: true, example: '1990-01-01'),
        new OA\Property(property: 'gender', type: 'string', nullable: true, example: 'male'),
        new OA\Property(property: 'citizenship', type: 'object', nullable: true, example: ['code' => 'PH', 'nationality' => 'Filipino']),
        new OA\Property(property: 'status', type: 'string', nullable: true, description: 'Lifecycle status: draft | completed', example: 'completed'),
        new OA\Property(property: 'address', ref: '#/components/schemas/UserAddress'),
        new OA\Property(property: 'photo', ref: '#/components/schemas/File', nullable: true),
        new OA\Property(property: 'last_login_at', type: 'string', nullable: true, example: '2026-07-07 10:30:00'),
        new OA\Property(property: 'profile_completed_at', type: 'string', nullable: true, example: '2026-08-21 10:12:45'),
        new OA\Property(property: 'details_editable_at', type: 'string', nullable: true, description: 'The day the profile details may next change (from its start); null = editable now.', example: '2026-09-20'),
        new OA\Property(property: 'photo_editable_at', type: 'string', nullable: true, description: 'When the photo may next change; null = editable now.', example: null),
    ],
)]
class UserProfileResource extends JsonResource
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
            'citizenship' => $this->citizenship ? ['code' => $this->citizenship->code, 'nationality' => $this->citizenship->nationality] : null,
            'status' => $this->status,
            'address' => $this->addressArray(),
            'photo' => $this->photo ? FileResource::make($this->photo) : null,
            'last_login_at' => $this->last_login_at?->format('Y-m-d H:i:s'),
            'profile_completed_at' => $this->profile_completed_at?->format('Y-m-d H:i:s'),
            'details_editable_at' => $this->nextChangeAllowedAt('details_changed_at')?->format('Y-m-d'),
            'photo_editable_at' => $this->nextChangeAllowedAt('photo_changed_at')?->format('Y-m-d'),
        ];
    }
}
