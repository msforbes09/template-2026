<?php

namespace App\Models\Notifications\Resources;

use App\Services\Notifications\NotificationCopy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/**
 * One in-app notification. `data` is the type-specific payload and ALWAYS
 * carries a `reference` key — `{type, …stable identifiers}` for FE deep
 * linking, or null when the destination follows from the `type` itself.
 * `title`/`message` are server-rendered from type + data at read time
 * (NotificationCopy) — the FE renders them verbatim and keeps only the
 * presentational mapping (tone/icon/toast) plus the `reference` deep link.
 */
#[OA\Schema(
    schema: 'Notification',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 42),
        new OA\Property(property: 'type', type: 'string', example: 'welcome.back', description: 'Short dotted type: welcome, welcome.back, profile.completed, security.password_changed, security.account_recovered, announcement. Unknown types still render with a generic title.'),
        new OA\Property(property: 'title', type: 'string', example: 'Welcome back!', description: 'Server-rendered headline — render verbatim. Always present (unknown types get a generic title).'),
        new OA\Property(property: 'message', type: 'string', nullable: true, example: "It's been 45 days since your last visit.", description: 'Server-rendered secondary line — render verbatim when non-null.'),
        new OA\Property(property: 'data', type: 'object', example: ['days_away' => 45, 'reference' => null], description: 'Type-specific payload; always includes `reference` (object or null).'),
        new OA\Property(property: 'read_at', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'created_at', type: 'string', example: '2026-08-27 14:05:11'),
    ],
)]
class NotificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $copy = NotificationCopy::render($this->type, $this->data);

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $copy['title'],
            'message' => $copy['message'],
            'data' => (object) ($this->data ?? []),
            'read_at' => $this->read_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
