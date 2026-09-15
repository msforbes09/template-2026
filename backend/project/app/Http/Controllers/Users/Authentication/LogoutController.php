<?php

namespace App\Http\Controllers\Users\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Log the user out (revoke all tokens).
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
            new OA\Response(response: 200, description: 'Logged out', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): UserProfileResource
    {
        $user = User::authenticated();

        $user->logout();

        return UserProfileResource::make($user);
    }
}
