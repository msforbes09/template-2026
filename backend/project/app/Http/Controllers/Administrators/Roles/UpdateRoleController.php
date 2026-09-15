<?php

namespace App\Http\Controllers\Administrators\Roles;

use App\Http\Controllers\Controller;
use App\Models\Access\Roles\Requests\UpdateRoleRequest;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use OpenApi\Attributes as OA;

/**
 * Update a role.
 */
class UpdateRoleController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/roles/{role}',
        summary: 'Update a role',
        description: 'Requires the `roles-view` and `roles-manage` abilities.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Content Editor'),
                    new OA\Property(property: 'description', type: 'string', nullable: true),
                    new OA\Property(property: 'meta', type: 'object', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError', examples: [
                new OA\Examples(example: 'forbidden', summary: 'Missing permission', value: ['error' => 'forbidden', 'message' => 'Forbidden.', 'error_description' => 'Forbidden.']),
                new OA\Examples(example: 'super_admin_role_protected', summary: 'Targeting the Super Admin role', value: ['error' => 'super_admin_role_protected', 'message' => 'The Super Admin role cannot be modified or deleted.', 'error_description' => 'The Super Admin role cannot be modified or deleted.']),
            ])),
            new OA\Response(response: 404, description: 'Role not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 200, description: 'Updated role', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Role')],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $role->update($request->validated());

        return RoleResource::make($role);
    }
}
