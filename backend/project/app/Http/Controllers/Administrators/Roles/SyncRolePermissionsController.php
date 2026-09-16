<?php

namespace App\Http\Controllers\Administrators\Roles;

use App\Http\Controllers\Controller;
use App\Models\Access\Roles\Requests\SyncRolePermissionsRequest;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use OpenApi\Attributes as OA;

/**
 * Sync the permissions assigned to a role.
 */
class SyncRolePermissionsController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/roles/{role}/sync-permissions',
        summary: "Replace a role's permissions with the given set",
        description: 'Requires the `roles-view` and `roles-manage` abilities.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['permission_ids'],
                properties: [
                    new OA\Property(property: 'permission_ids', type: 'array', items: new OA\Items(type: 'integer'), example: [1, 2]),
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
            new OA\Response(response: 200, description: "The role's resulting permissions", content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Role')],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(SyncRolePermissionsRequest $request, Role $role): RoleResource
    {
        $role->syncPermissionsAndAudit($request->validated('permission_ids'));

        return RoleResource::make($role->load('permissions'));
    }
}
