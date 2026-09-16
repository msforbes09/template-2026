<?php

namespace App\Http\Controllers\Users\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notifications\Resources\NotificationResource;
use App\Models\Users\User;
use App\Services\Notifications\NotificationQuery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * The user's own in-app notifications, newest first, with the unread count
 * in meta. List reads OpenSearch (MySQL fallback); the unread count always
 * comes from MySQL (cheap indexed count, exact where near-realtime is not).
 */
class ListNotificationsController extends Controller
{
    /**
     * List the caller's notifications.
     */
    #[OA\Get(
        path: '/notifications',
        summary: 'List my notifications',
        description: 'The caller\'s in-app notifications, newest first. `meta.unread_count` carries the live unread total for the bell badge.',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        parameters: [
            new OA\Parameter(name: 'unread', in: 'query', required: false, schema: new OA\Schema(type: 'integer', enum: [0, 1]), description: 'Pass 1 for unread rows only.'),
            new OA\Parameter(name: 'type', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Exact type filter (e.g. review.created).'),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Rows per page (default 15, max 50).'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Page number (default 1).'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The paginated list', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Notification')),
                new OA\Property(property: 'meta', type: 'object', example: ['current_page' => 1, 'last_page' => 1, 'per_page' => 15, 'total' => 2, 'unread_count' => 1]),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
        ],
    )]
    public function __invoke(Request $request, NotificationQuery $query): AnonymousResourceCollection
    {
        $user = User::authenticated();

        $page = $query->forUser(
            $user,
            $request->only(['unread', 'type']),
            min(50, max(1, (int) $request->query('per_page', '15'))),
            max(1, (int) $request->query('page', '1')),
        );

        return NotificationResource::collection($page)->additional([
            'meta' => ['unread_count' => $user->unreadNotifications()->count()],
        ]);
    }
}
