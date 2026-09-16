<?php

namespace App\Http\Controllers\Administrators\Users;

use App\Http\Controllers\Controller;
use App\Models\Users\Resources\UserResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Show a single user (bound by uuid).
 */
class ShowUserController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/users/{uuid}',
        summary: 'Show a user by uuid',
        security: [['bearerAuth' => []]],
        tags: ['Users'],
        parameters: [new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string'), example: '01931f2e-7b3a-73c4-9a1e-2f6b0c8d4e10')],
        responses: [
            new OA\Response(response: 200, description: 'User', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/User')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(User $user): UserResource
    {
        return UserResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
