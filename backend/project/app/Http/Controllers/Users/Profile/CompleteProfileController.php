<?php

namespace App\Http\Controllers\Users\Profile;

use App\Http\Controllers\Controller;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Complete the authenticated (website, draft) user's profile, unlocking the basic
 * features (rating/reviewing projects).
 */
class CompleteProfileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/profile/complete',
        summary: 'Complete the profile',
        description: 'Moves a website `draft` account to `completed` once every required profile field is filled, stamping `profile_completed_at`. Completion unlocks the rest of the account and starts the profile edit cooldown clocks. Applying to become a developer (`submit-for-assessment`) starts from `completed`.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        responses: [
            new OA\Response(response: 200, description: 'Completed', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 400, description: 'Not completable', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_status', summary: 'Not in draft', value: ['error' => 'invalid_status', 'message' => 'This action is not allowed for the current account status.', 'error_description' => 'This action is not allowed for the current account status.']),
                new OA\Examples(example: 'profile_incomplete', summary: 'Required fields missing', value: ['error' => 'profile_incomplete', 'message' => 'Please fill in every required profile field first.', 'error_description' => 'Please fill in every required profile field first.', 'meta' => ['missing' => ['barangay_code', 'address_line_one']]]),
            ])),
            new OA\Response(response: 403, description: 'Non-website account', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'profile_not_editable', 'message' => 'Only website-registered accounts can edit their profile.', 'error_description' => 'Only website-registered accounts can edit their profile.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 429, description: 'Too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(): UserProfileResource
    {
        $user = User::authenticated();
        $user->completeProfile();

        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
