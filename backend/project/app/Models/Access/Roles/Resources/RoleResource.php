<?php

namespace App\Models\Access\Roles\Resources;

use App\Models\Access\Permissions\Resources\PermissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Role into its API representation.
 */
#[OA\Schema(
    schema: 'Role',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Content Editor'),
        new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Manages content'),
        new OA\Property(property: 'meta', type: 'object', example: []),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(ref: '#/components/schemas/Permission')),
        new OA\Property(property: 'admins_count', type: 'integer', description: 'Administrators holding this role (list endpoint only; excludes deleted admins, includes deactivated ones).', example: 3),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-07-04 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', example: '2026-07-04 10:30:00'),
    ],
)]
class RoleResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'meta' => $this->meta ?? [],
            'permissions' => PermissionResource::collection($this->whenLoaded('permissions')),
            // List endpoint only (whenCounted) — the show doesn't pay for it.
            'admins_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
