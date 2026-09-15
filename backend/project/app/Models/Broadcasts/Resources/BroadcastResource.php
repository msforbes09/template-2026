<?php

namespace App\Models\Broadcasts\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * One admin broadcast history row: message, targeting, sender, and the
 * delivery outcome (`recipients_count`/`completed_at` are null until the
 * queued fan-out finishes).
 */
#[OA\Schema(
    schema: 'Broadcast',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 7),
        new OA\Property(property: 'status', type: 'string', enum: ['draft', 'sending', 'sent'], example: 'draft'),
        new OA\Property(property: 'title', type: 'string', example: 'Scheduled maintenance'),
        new OA\Property(property: 'body', type: 'string', example: 'The platform will be down Saturday 02:00-04:00.'),
        new OA\Property(property: 'filters', type: 'object', nullable: true, example: ['status' => 'completed'], description: 'The targeting as sent: {user_uuid} or {type and/or status}; null = all registered users.'),
        new OA\Property(property: 'recipients_count', type: 'integer', nullable: true, example: 148, description: 'Resolved by the fan-out job; null while still sending.'),
        new OA\Property(property: 'started_at', type: 'string', nullable: true, example: '2026-08-27 15:20:02', description: 'When the creator started delivery; null while draft.'),
        new OA\Property(property: 'completed_at', type: 'string', nullable: true, example: '2026-08-27 15:20:03'),
        new OA\Property(property: 'administrator', type: 'object', example: ['id' => 3, 'name' => 'Alex Rivera']),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-08-27 15:20:01'),
    ],
)]
class BroadcastResource extends JsonResource
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
            'status' => $this->status,
            'title' => $this->title,
            'body' => $this->body,
            'filters' => $this->filters,
            'recipients_count' => $this->recipients_count,
            'started_at' => $this->started_at?->format('Y-m-d H:i:s'),
            'completed_at' => $this->completed_at?->format('Y-m-d H:i:s'),
            'administrator' => [
                'id' => $this->administrator?->id,
                'name' => trim($this->administrator?->first_name.' '.$this->administrator?->last_name),
            ],
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
