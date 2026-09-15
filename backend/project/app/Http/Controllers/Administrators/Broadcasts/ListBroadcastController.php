<?php

namespace App\Http\Controllers\Administrators\Broadcasts;

use App\Http\Controllers\Controller;
use App\Models\Broadcasts\Broadcast;
use App\Models\Broadcasts\Resources\BroadcastResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * The broadcast history, newest first — who sent what to whom, and how many
 * users it reached.
 */
class ListBroadcastController extends Controller
{
    /**
     * List past broadcasts.
     */
    #[OA\Get(
        path: '/broadcasts',
        summary: 'List past broadcasts',
        description: 'Requires `notifications-broadcast`. Newest first.',
        security: [['bearerAuth' => []]],
        tags: ['Broadcasts'],
        parameters: [
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Rows per page (default 15, max 50).'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Page number (default 1).'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The paginated history', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Broadcast')),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 403, description: 'Missing permission', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'forbidden', 'message' => 'Forbidden.', 'error_description' => 'You do not have the required permission.'])),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        return BroadcastResource::collection(
            Broadcast::query()
                ->with('administrator')
                ->latest('id')
                ->paginate(min(50, max(1, (int) $request->query('per_page', '15')))),
        );
    }
}
