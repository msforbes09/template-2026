<?php

namespace App\Models\Misc\Audits\Resources;

use App\Models\Misc\Audits\Audit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The detailed audit shape for the admin show — the full change record. Per-model
 * sensitive fields are already excluded from the trail at write time (`$auditExclude`).
 *
 * @mixin Audit
 */
#[OA\Schema(
    schema: 'AuditLog',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}".', example: '2026_08:4096'),
        new OA\Property(property: 'event', type: 'string', example: 'updated'),
        new OA\Property(property: 'auditable_type', type: 'string', nullable: true, example: 'User'),
        new OA\Property(property: 'auditable_id', type: 'string', nullable: true, example: '42'),
        new OA\Property(property: 'old_values', type: 'object', nullable: true, example: ['status' => 'pending']),
        new OA\Property(property: 'new_values', type: 'object', nullable: true, example: ['status' => 'approved']),
        new OA\Property(property: 'url', type: 'string', nullable: true, example: 'https://api.example.com/api/v1/administrator/users/…'),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, example: '203.0.113.7'),
        new OA\Property(property: 'user_agent', type: 'string', nullable: true, example: 'Mozilla/5.0'),
        new OA\Property(property: 'user_type', type: 'string', nullable: true, example: 'Administrator'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 5),
        new OA\Property(property: 'tags', type: 'string', nullable: true, example: 'profile'),
        new OA\Property(property: 'created_at', type: 'string', nullable: true, example: '2026-08-14 10:30:00'),
        new OA\Property(property: 'updated_at', type: 'string', nullable: true, example: '2026-08-14 10:30:00'),
    ],
)]
class AuditLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->getScoutKey(),
            'event' => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'url' => $this->url,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'tags' => $this->tags,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
