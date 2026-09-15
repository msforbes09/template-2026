<?php

namespace App\Models\Contents\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Content into its API representation.
 */
#[OA\Schema(
    schema: 'Content',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'identifier', type: 'string', example: 'terms-of-service'),
        new OA\Property(property: 'body', type: 'object', example: ['en' => '<p>The terms...</p>']),
        new OA\Property(property: 'meta', type: 'object', example: ['title' => 'Terms of Service']),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-07-06 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', example: '2026-07-06 10:30:00'),
    ],
)]
class ContentResource extends JsonResource
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
            'identifier' => $this->identifier,
            'body' => $this->body ?? [],
            'meta' => $this->meta ?? [],
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
