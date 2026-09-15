<?php

namespace App\Http\Controllers\Users\Profile;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\UpdateUserProfileRequest;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Update the authenticated (website, draft) user's own profile.
 */
class UpdateProfileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/profile',
        summary: "Update the authenticated user's profile",
        description: 'Website-registered users may edit their own profile while their account is in `draft` or `for_resubmission`. Only the whitelisted fields can be changed; the photo has its own endpoint (`PATCH /profile/photo`), editable in any status.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['first_name', 'last_name', 'company_name', 'citizenship_code', 'region_code', 'municipality_code', 'barangay_code', 'address_line_one'],
            properties: [
                new OA\Property(property: 'first_name', type: 'string', example: 'Alex'),
                new OA\Property(property: 'last_name', type: 'string', example: 'Rivera'),
                new OA\Property(property: 'middle_name', type: 'string', nullable: true, example: 'Lee'),
                new OA\Property(property: 'suffix_name', type: 'string', nullable: true, example: 'Jr.'),
                new OA\Property(property: 'company_name', type: 'string', example: 'Acme Corp'),
                new OA\Property(property: 'birth_date', type: 'string', format: 'date', nullable: true, example: '1990-01-01'),
                new OA\Property(property: 'gender', type: 'string', enum: ['male', 'female'], nullable: true, example: 'male'),
                new OA\Property(property: 'citizenship_code', type: 'string', example: 'PH'),
                new OA\Property(property: 'region_code', type: 'string', example: '1300000000'),
                new OA\Property(property: 'province_code', type: 'string', nullable: true, example: null),
                new OA\Property(property: 'municipality_code', type: 'string', example: '1380600000'),
                new OA\Property(property: 'barangay_code', type: 'string', example: '1380601001'),
                new OA\Property(property: 'address_line_one', type: 'string', example: '123 Rizal St.'),
                new OA\Property(property: 'address_line_two', type: 'string', nullable: true, example: null),
                new OA\Property(property: 'postal_code', type: 'string', nullable: true, example: '1000'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 400, description: 'Not editable in the current status', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'invalid_status', 'message' => 'This action is not allowed for the current account status.', 'error_description' => 'This action is not allowed for the current account status.'])),
            new OA\Response(response: 403, description: 'Non-website account', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'profile_not_editable', 'message' => 'Only website-registered accounts can edit their profile.', 'error_description' => 'Only website-registered accounts can edit their profile.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateUserProfileRequest $request): UserProfileResource
    {
        $user = User::authenticated();
        $user->updateProfile($request->validated());

        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
