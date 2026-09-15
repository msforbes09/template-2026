<?php

namespace App\Models\Documentations\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * Transforms a Documentation into its API representation.
 */
#[OA\Schema(
    schema: 'Documentation',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'identifier', type: 'string', description: 'Slug key for the API documentation entry', example: 'getting-started'),
        new OA\Property(property: 'body', type: 'object', description: 'The documentation content (free-form; e.g. markdown/HTML + format)', example: ['format' => 'markdown', 'content' => "## Getting Started\n\nBase URL: `https://api.example.com/v1`\n\n### Authentication\nSend `Authorization: Bearer <token>`.\n\n### Endpoints\n- `POST /administrator/authenticate`\n- `GET /common/contents/{identifier}`"]),
        new OA\Property(property: 'meta', type: 'object', description: 'Metadata (title, version, category, …)', example: ['title' => 'Getting Started', 'version' => 'v1', 'category' => 'integration']),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-07-06 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', example: '2026-07-06 10:30:00'),
    ],
)]
class DocumentationResource extends JsonResource
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
