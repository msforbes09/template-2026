<?php

namespace App\Http\Controllers\Users\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\VerifyContactRequest;
use App\Models\Users\Resources\UserProfileResource;
use App\Models\Users\User;
use OpenApi\Attributes as OA;

/**
 * Complete adding a contact channel: verify the OTP sent to the new email/mobile
 * and set it on the authenticated account. Returns the updated profile.
 */
class VerifyContactController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/profile/verify-contact',
        summary: 'Verify and set the added contact channel',
        description: 'Verifies the one-time code sent to the new email/mobile and sets it (plus its verified-at timestamp) on the authenticated account. Returns the updated profile.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['otp'],
            properties: [
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'sms'], description: 'Must match the add-contact step (default email).', example: 'email'),
                new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Required when channel is email.', example: 'new@example.com'),
                new OA\Property(property: 'mobile_number', type: 'string', description: 'Required when channel is sms. Format +639XXXXXXXXX.', example: '+639171234567'),
                new OA\Property(property: 'otp', type: 'string', example: '123456'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Added', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/UserProfile')])),
            new OA\Response(response: 400, description: 'Invalid/expired code, or the channel is already set', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_otp', summary: 'Wrong or expired code (also when the contact is taken)', value: ['error' => 'invalid_otp', 'message' => 'The code is invalid or has expired.', 'error_description' => 'The code is invalid or has expired.']),
                new OA\Examples(example: 'contact_already_set', summary: 'Channel already set', value: ['error' => 'contact_already_set', 'message' => 'This contact channel is already set on your account.', 'error_description' => 'This contact channel is already set on your account.']),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'OTP locked / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(VerifyContactRequest $request): UserProfileResource
    {
        $user = $request->user();
        $user->verifyContact($request->channel(), $request->channelIdentifier(), $request->validated('otp'));

        return UserProfileResource::make($user->load(['photo', 'citizenship', ...User::ADDRESS_RELATIONS]));
    }
}
