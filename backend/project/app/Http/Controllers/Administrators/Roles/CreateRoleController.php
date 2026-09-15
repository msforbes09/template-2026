<?php

namespace App\Http\Controllers\Administrators\Roles;

use App\Http\Controllers\Controller;
use App\Models\Access\Roles\Requests\StoreRoleRequest;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Create a role.
 */
class CreateRoleController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/roles',
        summary: 'Create a role',
        description: 'Requires the `roles-view` and `roles-manage` abilities.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Content Editor'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Manages content'),
                    new OA\Property(property: 'meta', type: 'object', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 201, description: 'Created role', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Role')],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(StoreRoleRequest $request): JsonResponse
    {
        $role = Role::create([
            ...$request->validated(),
            'guard_name' => Administrator::AUTH_GUARD,
        ]);

        return RoleResource::make($role)->response()->setStatusCode(201);
    }
}
