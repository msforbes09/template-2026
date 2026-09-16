<?php

namespace App\Http\Controllers\Users\Profile;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\UpdateProfilePhotoRequest;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Change the authenticated user's profile photo — allowed in any account
 * status (unlike the rest of the profile, which is draft/for_resubmission
 * only).
 */
class UpdateProfilePhotoController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Patch(
        path: '/profile/photo',
        summary: "Update the authenticated user's profile photo",
        description: 'Website-registered users may change (or clear, with null) their photo in ANY account status — the rest of the profile stays editable only in `draft`/`for_resubmission` via `PUT /profile`. The file must be a private upload owned by the caller; re-submitting the current photo unchanged always passes.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'photo_uuid', type: 'string', nullable: true, example: '9b1f...file-uuid'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Photo updated', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 400, description: 'Changed too recently', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'profile_change_cooldown', 'message' => 'Your profile was changed recently. Please wait before changing it again.', 'error_description' => 'Your profile was changed recently. Please wait before changing it again.', 'meta' => ['next_change_at' => '2026-09-20']])),
            new OA\Response(response: 403, description: 'Non-website account', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'profile_not_editable', 'message' => 'Only website-registered accounts can edit their profile.', 'error_description' => 'Only website-registered accounts can edit their profile.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error (unknown file, or a private file the caller does not own)', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateProfilePhotoRequest $request): UserProfileResource
    {
        $user = User::authenticated();
        $user->updatePhoto($request->validated('photo_uuid'));

        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
