<?php

namespace App\Http\Controllers\Administrators\Broadcasts;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Soft-delete a broadcast DRAFT — creator only, drafts only. A started
 * broadcast is history and cannot be removed.
 */
class DeleteBroadcastController extends Controller
{
    /**
     * Discard the draft.
     */
    #[OA\Delete(
        path: '/broadcasts/{id}',
        summary: 'Delete a broadcast draft',
        description: 'Requires `notifications-broadcast` AND being the creator. Soft delete; only a `draft` may be removed.',
        security: [['bearerAuth' => []]],
        tags: ['Broadcasts'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 7)],
        responses: [
            new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', example: ['deleted' => 1]),
            ])),
            new OA\Response(response: 400, description: 'Not a draft', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'invalid_status', 'message' => 'This action is only allowed while the broadcast is a draft.', 'error_description' => 'This action is only allowed while the broadcast is a draft.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 403, description: 'Not the creator (or missing permission)', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'broadcast_not_owned', 'message' => 'Only the administrator who created this broadcast can manage it.', 'error_description' => 'Only the administrator who created this broadcast can manage it.'])),
            new OA\Response(response: 404, description: 'Unknown broadcast', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'not_found', 'message' => 'Resource not found.', 'error_description' => 'The requested resource does not exist.'])),
        ],
    )]
    public function __invoke(Broadcast $broadcast): JsonResponse
    {
        $broadcast->checkOwner(Administrator::authenticated()->getKey());
        $broadcast->discard();

        return response()->json(['data' => ['deleted' => 1]]);
    }
}
