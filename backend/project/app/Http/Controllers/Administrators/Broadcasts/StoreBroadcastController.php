<?php

namespace App\Http\Controllers\Administrators\Broadcasts;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Broadcasts\Broadcast;
use App\Models\Broadcasts\Requests\StoreBroadcastRequest;
use App\Models\Broadcasts\Resources\BroadcastResource;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Compose an announcement DRAFT for users: all registered users, a
 * filtered subset (type/status), or one user by uuid. Nothing is delivered
 * until the creator starts it (POST …/{id}/start).
 */
class StoreBroadcastController extends Controller
{
    /**
     * Send a broadcast.
     */
    #[OA\Post(
        path: '/broadcasts',
        summary: 'Create a broadcast draft',
        description: 'Requires `notifications-broadcast`. Creates a DRAFT — nothing is delivered until the creator starts it. Targets ALL registered users by default; narrow with `type`/`status`, or exactly one user with `user_uuid` (which forbids the filters).',
        security: [['bearerAuth' => []]],
        tags: ['Broadcasts'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['title', 'body'],
            properties: [
                new OA\Property(property: 'title', type: 'string', maxLength: 150, example: 'Scheduled maintenance'),
                new OA\Property(property: 'body', type: 'string', maxLength: 1000, example: 'The platform will be down Saturday 02:00-04:00.'),
                new OA\Property(property: 'user_uuid', type: 'string', nullable: true, example: '9d3f8b12-1c2d-4e5f-8a9b-0c1d2e3f4a5b', description: 'Send to exactly this user (forbids type/status).'),
                new OA\Property(property: 'status', type: 'string', nullable: true, enum: ['draft', 'completed'], example: 'completed'),
            ],
        )),
        responses: [
            new OA\Response(response: 201, description: 'Draft created', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Broadcast'),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'unauthenticated', 'message' => 'Unauthenticated.', 'error_description' => 'Authentication is required.'])),
            new OA\Response(response: 403, description: 'Missing permission', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'forbidden', 'message' => 'Forbidden.', 'error_description' => 'You do not have the required permission.'])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(example: ['message' => 'The title field is required.', 'errors' => ['title' => ['The title field is required.']]])),
        ],
    )]
    public function __invoke(StoreBroadcastRequest $request): JsonResponse
    {
        $broadcast = Broadcast::draft(
            Administrator::authenticated(),
            $request->validated('title'),
            $request->validated('body'),
            $request->filters(),
        );

        return BroadcastResource::make($broadcast->load('administrator'))->response()->setStatusCode(201);
    }
}
