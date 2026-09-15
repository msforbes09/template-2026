<?php

namespace App\Models\Access\PermissionGroups\Resources;

use App\Models\Access\Permissions\Resources\PermissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a PermissionGroup (with its permissions) into its API representation.
 */
#[OA\Schema(
    schema: 'PermissionGroup',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Administrators'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'meta', type: 'object', example: []),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(ref: '#/components/schemas/Permission')),
    ],
)]
class PermissionGroupResource extends JsonResource
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
        ];
    }
}
