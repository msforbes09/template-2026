<?php

namespace App\Http\Controllers\Users\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notifications\Notification;
use App\Models\Notifications\Resources\NotificationResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Mark one of the user's own notifications read (idempotent). A foreign or
 * unknown id is a 404 — indistinguishable from missing. Exempt from the
 * suspension freeze: dismissing a notice is read-only in spirit.
 */
class MarkNotificationReadController extends Controller
{
    /**
     * Mark the notification read.
     */
    #[OA\Post(
        path: '/notifications/{id}/read',
        summary: 'Mark one notification read',
        description: 'Idempotent. Own notifications only — a foreign id answers 404. Works while suspended (the freeze exempts it, like logout).',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 42)],
        responses: [
            new OA\Response(response: 200, description: 'The notification, now read', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Notification'),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 404, description: 'Not yours / unknown', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'not_found', 'message' => 'Resource not found.', 'error_description' => 'The requested resource does not exist.'])),
        ],
    )]
    public function __invoke(int $id): NotificationResource
    {
        $notification = Notification::findOwnedOrFail(User::authenticated(), $id);

        $notification->markAsRead();

        return NotificationResource::make($notification);
    }
}
