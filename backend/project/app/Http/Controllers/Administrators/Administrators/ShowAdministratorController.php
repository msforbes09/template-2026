<?php

namespace App\Http\Controllers\Administrators\Administrators;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Resources\AdministratorResource;
use OpenApi\Attributes as OA;

/**
 * Show a single administrator.
 */
class ShowAdministratorController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/administrators/{administrator}',
        summary: 'Show an administrator',
        description: 'Requires the `administrators-view` ability.',
        tags: ['Administrators'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'administrator', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 200, description: 'Administrator', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(Administrator $administrator): AdministratorResource
    {
        return AdministratorResource::make($administrator->load('roles'));
    }
}
