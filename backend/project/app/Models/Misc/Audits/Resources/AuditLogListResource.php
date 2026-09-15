<?php

namespace App\Models\Misc\Audits\Resources;

use App\Models\Misc\Audits\Audit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The minimal audit shape for the admin list endpoint. The old/new value blobs are
 * not surfaced here.
 *
 * @mixin Audit
 */
#[OA\Schema(
    schema: 'AuditLogList',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}" — pass to the show endpoint.', example: '2026_08:4096'),
        new OA\Property(property: 'event', type: 'string', example: 'updated'),
        new OA\Property(property: 'auditable_type', type: 'string', nullable: true, example: 'User'),
        new OA\Property(property: 'auditable_id', type: 'string', nullable: true, example: '42'),
        new OA\Property(property: 'user_type', type: 'string', nullable: true, example: 'Administrator'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 5),
        new OA\Property(property: 'tags', type: 'string', nullable: true, example: 'profile'),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-08-14 10:30:00'),
    ],
)]
class AuditLogListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return $this->resource->toListArray();
    }
}
