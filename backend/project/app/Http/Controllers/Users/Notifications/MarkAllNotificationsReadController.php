<?php

namespace App\Http\Controllers\Users\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notifications\Notification;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Mark every unread notification of the caller read. Chunked MODEL saves —
 * never a bulk query update — so Scout observes each read_at flip and the
 * OpenSearch documents stay truthful. Freeze-exempt like the single mark.
 */
class MarkAllNotificationsReadController extends Controller
{
    /**
     * Mark all unread notifications read.
     */
    #[OA\Post(
        path: '/notifications/read-all',
        summary: 'Mark all notifications read',
        description: 'Marks every unread notification of the caller read and returns how many were affected. Works while suspended.',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'The affected count', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', example: ['marked' => 3]),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
        ],
    )]
    public function __invoke(): JsonResponse
    {
        $marked = 0;

        User::authenticated()->unreadNotifications()->chunkById(100, function ($chunk) use (&$marked): void {
            $chunk->each(function (Notification $notification) use (&$marked): void {
                $notification->markAsRead();
                $marked++;
            });
        });

        return response()->json(['data' => ['marked' => $marked]]);
    }
}
