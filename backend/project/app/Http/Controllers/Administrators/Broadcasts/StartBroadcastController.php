<?php

namespace App\Http\Controllers\Administrators\Broadcasts;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Broadcasts\Resources\BroadcastResource;
use OpenApi\Attributes as OA;

/**
 * Start a broadcast DRAFT — creator only. Flips it to `sending`, queues the
 * fan-out (each recipient gets the `announcement` in-app notification + the
 * realtime push), and the job lands it on `sent` with the recipient count.
 */
class StartBroadcastController extends Controller
{
    /**
     * Start the broadcast.
     */
    #[OA\Post(
        path: '/broadcasts/{id}/start',
        summary: 'Start a broadcast',
        description: 'Requires `notifications-broadcast` AND being the creator. Only a `draft` can start; delivery is asynchronous — `recipients_count`/`completed_at` fill in when the fan-out finishes (status `sent`).',
        security: [['bearerAuth' => []]],
        tags: ['Broadcasts'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 7)],
        responses: [
            new OA\Response(response: 200, description: 'Started', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Broadcast'),
            ])),
            new OA\Response(response: 400, description: 'Not a draft (already started/sent)', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'invalid_status', 'message' => 'This action is only allowed while the broadcast is a draft.', 'error_description' => 'This action is only allowed while the broadcast is a draft.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 403, description: 'Not the creator (or missing permission)', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'broadcast_not_owned', 'message' => 'Only the administrator who created this broadcast can manage it.', 'error_description' => 'Only the administrator who created this broadcast can manage it.'])),
            new OA\Response(response: 404, description: 'Unknown broadcast', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'not_found', 'message' => 'Resource not found.', 'error_description' => 'The requested resource does not exist.'])),
        ],
    )]
    public function __invoke(Broadcast $broadcast): BroadcastResource
    {
        $broadcast->checkOwner(Administrator::authenticated()->getKey());
        $broadcast->start();

        return BroadcastResource::make($broadcast->fresh()->load('administrator'));
    }
}
