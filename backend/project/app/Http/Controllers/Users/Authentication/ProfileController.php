<?php

namespace App\Http\Controllers\Users\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Return the authenticated user's profile.
 */
class ProfileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/profile',
        summary: "The authenticated user's profile",
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        responses: [
            new OA\Response(response: 200, description: 'Profile', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): UserProfileResource
    {
        $user = User::authenticated();

        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
