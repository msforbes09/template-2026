<?php

namespace App\Models\Misc\Connections\Resources;

use App\Models\Misc\Connections\Connection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * The detailed connection-log shape for the admin show — the full outbound call.
 * Body fields (headers/params/payload/response) are already masked at write time
 * by ConnectionService.
 *
 * @mixin Connection
 */
#[OA\Schema(
    schema: 'ConnectionLog',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Self-describing "{Y_m}:{id}".', example: '2026_08:2048'),
        new OA\Property(property: 'type', type: 'string', example: 'sms'),
        new OA\Property(property: 'reference', type: 'string', nullable: true, example: 'sms-8842'),
        new OA\Property(property: 'method', type: 'string', example: 'POST'),
        new OA\Property(property: 'url', type: 'string', example: 'https://sms.example.com/v1/push'),
        new OA\Property(property: 'headers', type: 'object', nullable: true, example: ['Content-Type' => 'application/json']),
        new OA\Property(property: 'params', type: 'object', nullable: true, example: []),
        new OA\Property(property: 'payload', type: 'object', nullable: true, example: ['number' => '+639*******67']),
        new OA\Property(property: 'response', type: 'object', nullable: true, example: ['data' => ['message' => 'ok']]),
        new OA\Property(property: 'status_code', type: 'string', nullable: true, example: '200'),
        new OA\Property(property: 'duration_ms', type: 'integer', nullable: true, example: 88),
        new OA\Property(property: 'exception', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, example: '112.198.1.20'),
        new OA\Property(property: 'user_type', type: 'string', nullable: true, example: 'User'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 42),
        new OA\Property(property: 'requested_at', type: 'string', example: '2026-08-14 10:30:00'),
    ],
)]
class ConnectionLogResource extends JsonResource
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
            'type' => $this->type,
            'reference' => $this->reference,
            'method' => $this->method,
            'url' => $this->url,
            'headers' => $this->headers,
            'params' => $this->params,
            'payload' => $this->payload,
            'response' => $this->response,
            'status_code' => $this->status_code,
            'duration_ms' => $this->duration_ms,
            'exception' => $this->exception,
            'ip_address' => $this->ip_address,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'requested_at' => $this->requested_at?->format('Y-m-d H:i:s'),
        ];
    }
}
