<?php

namespace App\Http\Controllers\Users\Profile;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\DeleteAccountRequest;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Delete the authenticated user's own account (password-confirmed soft delete).
 */
class DeleteProfileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Delete(
        path: '/profile',
        summary: 'Delete your account',
        description: 'Soft-deletes the authenticated user\'s account after re-entering the current password (web/password accounts). Revokes gateway credentials, all sessions, and 2FA state. Data is retained for audit; re-registering the same identifier later RECOVERS this account (history, type, status — including a live suspension) with a new password.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['password'],
            properties: [
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Secret@123'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Account deleted (the final profile snapshot, same shape as show/update)', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Wrong or missing password', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(DeleteAccountRequest $request): UserProfileResource
    {
        $user = User::authenticated();
        $user->deleteAccount();

        // The same envelope as the profile show/update, for consistency: the
        // final (now soft-deleted) snapshot of the account.
        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
