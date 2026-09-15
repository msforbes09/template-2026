<?php

namespace App\Http\Controllers\Administrators\Roles;

use App\Http\Controllers\Controller;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use OpenApi\Attributes as OA;

/**
 * Show a single role with its permissions.
 */
class ShowRoleController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/roles/{role}',
        summary: 'Show a role with its permissions',
        description: 'Requires the `roles-view` ability.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Role not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 200, description: 'The role', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Role')],
            )),
        ],
    )]
    public function __invoke(Role $role): RoleResource
    {
        return RoleResource::make($role->load('permissions'));
    }
}
