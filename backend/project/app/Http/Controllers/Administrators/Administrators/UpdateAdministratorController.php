<?php

namespace App\Http\Controllers\Administrators\Administrators;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\UpdateAdministratorRequest;
use App\Models\Administrators\Resources\AdministratorResource;
use OpenApi\Attributes as OA;

/**
 * Update an administrator.
 */
class UpdateAdministratorController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/administrators/{administrator}',
        summary: 'Update an administrator',
        description: 'Requires the `administrators-view` and `administrators-manage` abilities. **The email address cannot be changed here.** An `email` in the payload is accepted but silently discarded — sending the record back unchanged is safe, but the address will not move. Repointing another administrator\'s address and then resetting their password would deliver the temporary password to the new address, so the field is not updatable through management. There is currently no API path to change an administrator\'s email.',
        tags: ['Administrators'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'administrator', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'first_name', type: 'string', example: 'Ada'),
                    new OA\Property(property: 'last_name', type: 'string', example: 'Lovelace'),
                    new OA\Property(property: 'photo_uuid', type: 'string', description: 'UUID of a previously uploaded private file (POST /common/files/private)', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
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
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateAdministratorRequest $request, Administrator $administrator): AdministratorResource
    {
        $administrator->update($request->validated());

        return AdministratorResource::make($administrator);
    }
}
