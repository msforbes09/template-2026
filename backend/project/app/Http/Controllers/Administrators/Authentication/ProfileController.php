<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Resources\AdministratorProfileResource;
use OpenApi\Attributes as OA;

/**
 * Return the authenticated administrator's profile.
 */
class ProfileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/profile',
        summary: "The authenticated administrator's profile",
        security: [['bearerAuth' => []]],
        tags: ['Authentication'],
        responses: [
            new OA\Response(response: 200, description: "Profile (includes a `permissions` array of the current token's abilities)", content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): AdministratorProfileResource
    {
        return AdministratorProfileResource::make(Administrator::authenticated());
    }
}
