<?php

namespace App\Models\Misc\AuthAttempts\Resources;

use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Services\Security\PiiMasker;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The detailed auth-attempt shape for the admin show. The `identifier` is always
 * **masked** (the plaintext lives only in the at-rest `ciphertext` blob, decrypted
 * directly when an investigation needs it); the blind-index `identifier_hash` is
 * internal (use the list `identifier` filter).
 *
 * @mixin AuthAttempt
 */
#[OA\Schema(
    schema: 'AuthAttemptLog',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}".', example: '2026_08:512'),
        new OA\Property(property: 'guard', type: 'string', example: 'administrators'),
        new OA\Property(property: 'event', type: 'string', example: 'invalid_credentials'),
        new OA\Property(property: 'identifier', type: 'string', nullable: true, description: 'Masked (`k•••••l@example.com`, `+6391•••••567`); the plaintext is never returned by the API.', example: 'j•••@example.com'),
        new OA\Property(property: 'user_type', type: 'string', nullable: true, example: 'Administrator'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 5),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, example: '203.0.113.7'),
        new OA\Property(property: 'user_agent', type: 'string', nullable: true, example: 'Mozilla/5.0'),
        new OA\Property(property: 'attempted_at', type: 'string', example: '2026-08-14 10:30:00'),
    ],
)]
class AuthAttemptLogResource extends JsonResource
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
            'guard' => $this->guard,
            'event' => $this->event,
            // Always the MASKED identifier (idempotent re-mask covers legacy raw
            // rows) — the plaintext lives only in the ciphertext blob, decrypted
            // directly (tinker/DB) when an investigation needs it.
            'identifier' => PiiMasker::maskIdentifier($this->identifier),
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'attempted_at' => $this->attempted_at?->format('Y-m-d H:i:s'),
        ];
    }
}
