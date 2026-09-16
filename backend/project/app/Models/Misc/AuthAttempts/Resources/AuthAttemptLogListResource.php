<?php

namespace App\Models\Misc\AuthAttempts\Resources;

use App\Models\Misc\AuthAttempts\AuthAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The minimal auth-attempt shape for the admin list endpoint. The raw identifier is
 * never surfaced (it is not even indexed).
 *
 * @mixin AuthAttempt
 */
#[OA\Schema(
    schema: 'AuthAttemptLogList',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}" — pass to the show endpoint.', example: '2026_08:512'),
        new OA\Property(property: 'guard', type: 'string', example: 'users'),
        new OA\Property(property: 'event', type: 'string', example: 'invalid_credentials'),
        new OA\Property(property: 'identifier', type: 'string', nullable: true, description: 'The address tried, masked at write time (`j•••@example.com`, `+6391•••••567`); never the plaintext.', example: 'j•••@example.com'),
        new OA\Property(property: 'user_type', type: 'string', nullable: true, example: 'User'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 42),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, example: '203.0.113.7'),
        new OA\Property(property: 'attempted_at', type: 'string', example: '2026-08-14 10:30:00'),
    ],
)]
class AuthAttemptLogListResource extends JsonResource
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
