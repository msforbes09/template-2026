<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Resources\AdministratorProfileResource;
use OpenApi\Attributes as OA;

/**
 * Revoke all of the administrator's access tokens.
 */
class LogoutController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/logout',
        summary: 'Log out (revoke all tokens)',
        security: [['bearerAuth' => []]],
        tags: ['Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Logged out', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): AdministratorProfileResource
    {
        $administrator = Administrator::authenticated();

        $administrator->logout();

        return AdministratorProfileResource::make($administrator);
    }
}
