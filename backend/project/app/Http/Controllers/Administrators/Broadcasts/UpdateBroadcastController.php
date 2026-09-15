<?php

namespace App\Http\Controllers\Administrators\Broadcasts;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Broadcasts\Requests\StoreBroadcastRequest;
use App\Models\Broadcasts\Resources\BroadcastResource;
use OpenApi\Attributes as OA;

/**
 * Edit a broadcast DRAFT (message + whole-set retargeting) — creator only,
 * drafts only.
 */
class UpdateBroadcastController extends Controller
{
    /**
     * Update the draft.
     */
    #[OA\Put(
        path: '/broadcasts/{id}',
        summary: 'Update a broadcast draft',
        description: 'Requires `notifications-broadcast` AND being the creator. Only a `draft` may change; the targeting is replaced wholesale, like creation.',
        security: [['bearerAuth' => []]],
        tags: ['Broadcasts'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 7)],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['title', 'body'],
            properties: [
                new OA\Property(property: 'title', type: 'string', maxLength: 150, example: 'Scheduled maintenance (moved)'),
                new OA\Property(property: 'body', type: 'string', maxLength: 1000, example: 'Now Sunday 02:00-04:00.'),
                new OA\Property(property: 'user_uuid', type: 'string', nullable: true, example: null, description: 'Send to exactly this user (forbids type/status).'),
                new OA\Property(property: 'status', type: 'string', nullable: true, enum: ['draft', 'completed'], example: 'completed'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'The updated draft', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Broadcast'),
            ])),
            new OA\Response(response: 400, description: 'Not a draft', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'invalid_status', 'message' => 'This action is only allowed while the broadcast is a draft.', 'error_description' => 'This action is only allowed while the broadcast is a draft.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 403, description: 'Not the creator (or missing permission)', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'broadcast_not_owned', 'message' => 'Only the administrator who created this broadcast can manage it.', 'error_description' => 'Only the administrator who created this broadcast can manage it.'])),
            new OA\Response(response: 404, description: 'Unknown broadcast', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'not_found', 'message' => 'Resource not found.', 'error_description' => 'The requested resource does not exist.'])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(example: ['message' => 'The title field is required.', 'errors' => ['title' => ['The title field is required.']]])),
        ],
    )]
    public function __invoke(StoreBroadcastRequest $request, Broadcast $broadcast): BroadcastResource
    {
        $broadcast->checkOwner(Administrator::authenticated()->getKey());
        $broadcast->updateDraft($request->validated('title'), $request->validated('body'), $request->filters());

        return BroadcastResource::make($broadcast->fresh()->load('administrator'));
    }
}
