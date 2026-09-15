<?php

namespace App\Http\Controllers\Administrators\Administrators;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\SyncAdministratorRolesRequest;
use App\Models\Administrators\Resources\AdministratorResource;
use OpenApi\Attributes as OA;

/**
 * Sync the roles assigned to an administrator.
 */
class SyncAdministratorRolesController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/administrators/{administrator}/sync-roles',
        summary: "Replace an administrator's roles with the given set",
        description: 'Requires the `administrators-view` and `administrators-manage` abilities.',
        tags: ['Administrators'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'administrator', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['role_ids'],
                properties: [
                    new OA\Property(property: 'role_ids', type: 'array', items: new OA\Items(type: 'integer'), example: [1, 2]),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError', examples: [
                new OA\Examples(example: 'forbidden', summary: 'Missing permission', value: ['error' => 'forbidden', 'message' => 'Forbidden.', 'error_description' => 'Forbidden.']),
                new OA\Examples(example: 'self_management_forbidden', summary: 'Targeting your own account', value: ['error' => 'self_management_forbidden', 'message' => 'You cannot manage your own account through these endpoints.', 'error_description' => 'You cannot manage your own account through these endpoints.']),
                new OA\Examples(example: 'super_administrator_protected', summary: 'Targeting a super administrator as a lesser admin', value: ['error' => 'super_administrator_protected', 'message' => 'The super administrator cannot be managed through the API.', 'error_description' => 'The super administrator cannot be managed through the API.']),
            ])),
            new OA\Response(response: 404, description: 'Administrator not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 200, description: 'The administrator with its resulting roles', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(SyncAdministratorRolesRequest $request, Administrator $administrator): AdministratorResource
    {
        $administrator->syncRolesAndAudit($request->validated('role_ids'));

        return AdministratorResource::make($administrator->load('roles'));
    }
}
