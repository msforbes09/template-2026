<?php

namespace App\Models\Misc\Connections\Resources;

use App\Models\Misc\Connections\Connection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The minimal connection-log shape for the admin list endpoint. The full
 * request/response body is not exposed here.
 *
 * @mixin Connection
 */
#[OA\Schema(
    schema: 'ConnectionLogList',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}" — pass to the show endpoint.', example: '2026_08:2048'),
        new OA\Property(property: 'type', type: 'string', example: 'sms'),
        new OA\Property(property: 'reference', type: 'string', nullable: true, description: 'Caller-supplied correlation key (e.g. a masked mobile number for an SMS provider, or an exchange code for an SSO partner)', example: '+6391*****567'),
        new OA\Property(property: 'method', type: 'string', example: 'POST'),
        new OA\Property(property: 'url', type: 'string', example: 'https://sms.example.com/v1/push'),
        new OA\Property(property: 'status_code', type: 'string', nullable: true, example: '200'),
        new OA\Property(property: 'duration_ms', type: 'integer', nullable: true, example: 88),
        new OA\Property(property: 'requested_at', type: 'string', example: '2026-08-14 10:30:00'),
    ],
)]
class ConnectionLogListResource extends JsonResource
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
