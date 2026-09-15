<?php

namespace App\Http\Controllers\Users\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\AddContactRequest;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Begin adding the account's missing contact channel: send an OTP to the new
 * email or mobile. Nothing is set yet. Resend via POST /common/otp/resend.
 */
class AddContactController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/profile/add-contact',
        summary: 'Add the account\'s missing contact channel (send OTP)',
        description: 'Sends a one-time code to the new email (channel=email) or mobile (channel=sms) to add it to the authenticated account. Only the channel the account does not yet have can be added; a channel already set returns 400 contact_already_set. If the contact already belongs to another account the response is identical (no OTP is usable). Resend via POST /common/otp/resend.',
        security: [['bearerAuth' => []]],
        tags: ['Profile'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'sms'], description: 'The contact channel to add (default email).', example: 'email'),
                new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Required when channel is email.', example: 'new@example.com'),
                new OA\Property(property: 'mobile_number', type: 'string', description: 'Required when channel is sms. Format +639XXXXXXXXX.', example: '+639171234567'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Code sent — returns the resend handle and cooldown.', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'resend_token', type: 'string', example: 'a1b2c3d4...'),
                    new OA\Property(property: 'retry_after', type: 'integer', example: 60),
                ],
            )),
            new OA\Response(response: 400, description: 'The channel is already set on the account', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'contact_already_set', 'message' => 'This contact channel is already set on your account.', 'error_description' => 'This contact channel is already set on your account.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Cooldown / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(AddContactRequest $request): JsonResponse
    {
        $result = $request->user()->addContact($request->channel(), $request->channelIdentifier());

        return response()->json([
            'resend_token' => $result->resendToken,
            'retry_after' => $result->retryAfter,
        ]);
    }
}
