<?php

namespace App\Models\Administrators\Resources;

use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Misc\Files\Resources\FileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms an Administrator into its public API representation.
 */
#[OA\Schema(
    schema: 'Administrator',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@example.com'),
        new OA\Property(property: 'first_name', type: 'string', example: 'Ada'),
        new OA\Property(property: 'last_name', type: 'string', example: 'Lovelace'),
        new OA\Property(property: 'photo', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'uuid', type: 'string', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
            new OA\Property(property: 'url', type: 'string', description: 'Signed CloudFront URL', example: 'https://cdn.example.com/uploads/9f1c....jpg?Signature=...'),
            new OA\Property(property: 'original_name', type: 'string', example: 'ada.jpg'),
            new OA\Property(property: 'mime_type', type: 'string', example: 'image/jpeg'),
            new OA\Property(property: 'size', type: 'integer', example: 20481),
        ]),
        new OA\Property(property: 'is_active', type: 'integer', enum: [0, 1], example: 1),
        new OA\Property(property: 'with_temporary_password', type: 'integer', enum: [0, 1], example: 1),
        new OA\Property(property: 'last_login_at', type: 'string', example: '2026-07-04 10:30:00', nullable: true),
        new OA\Property(property: 'auth_validated', type: 'string', example: '2026-07-04 10:30:00', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-07-04 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', example: '2026-07-04 10:30:00'),
        new OA\Property(property: 'roles', type: 'array', items: new OA\Items(ref: '#/components/schemas/Role')),
    ],
)]
class AdministratorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'photo' => $this->photo ? FileResource::make($this->photo) : null,
            'is_active' => (int) $this->is_active,
            'with_temporary_password' => (int) $this->with_temporary_password,
            'last_login_at' => $this->last_login_at?->format('Y-m-d H:i:s'),
            'auth_validated' => $this->auth_validated?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
        ];
    }
}
