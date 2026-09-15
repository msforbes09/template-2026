<?php

namespace App\Http\Controllers\Administrators\Administrators;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\StoreAdministratorRequest;
use App\Models\Administrators\Resources\AdministratorResource;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Create an administrator.
 */
class CreateAdministratorController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/administrators',
        summary: 'Create an administrator (a temporary password is generated and emailed)',
        description: 'Requires the `administrators-view` and `administrators-manage` abilities.',
        tags: ['Administrators'],
        security: [['bearerAuth' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'first_name', 'last_name', 'photo_uuid'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@example.com'),
                    new OA\Property(property: 'first_name', type: 'string', example: 'Ada'),
                    new OA\Property(property: 'last_name', type: 'string', example: 'Lovelace'),
                    new OA\Property(property: 'photo_uuid', type: 'string', description: 'UUID of a previously uploaded private file (POST /common/files/private)', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(StoreAdministratorRequest $request): JsonResponse
    {
        $administrator = Administrator::createAndGeneratePassword($request->validated());

        return AdministratorResource::make($administrator)
            ->response()
            ->setStatusCode(201);
    }
}
