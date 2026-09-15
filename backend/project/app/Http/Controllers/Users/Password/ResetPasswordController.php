<?php

namespace App\Http\Controllers\Users\Password;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\ResetUserPasswordRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Complete a password reset with the emailed OTP; sets the new password, revokes
 * all sessions, and returns a fresh token.
 */
class ResetPasswordController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/reset-password',
        summary: 'Reset the password with an emailed code',
        description: 'Verifies the reset code and sets a new password (which must differ from the current one). Revokes all existing tokens and returns a fresh one.',
        tags: ['Password'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['otp', 'new_password', 'new_password_confirmation'],
            properties: [
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'sms'], description: 'Must match the forgot-password step (default email).', example: 'email'),
                new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Required when channel is email.', example: 'user@example.com'),
                new OA\Property(property: 'mobile_number', type: 'string', description: 'Required when channel is sms. Format +639XXXXXXXXX.', example: '+639171234567'),
                new OA\Property(property: 'otp', type: 'string', example: '123456'),
                new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'BrandNew@456'),
                new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'BrandNew@456'),
                new OA\Property(property: 'captcha', type: 'string', example: 'cf-turnstile-response-token'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Reset', content: new OA\JsonContent(properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')])),
            new OA\Response(response: 400, description: 'Invalid code or unchanged password', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_otp', summary: 'Wrong or expired code', value: ['error' => 'invalid_otp', 'message' => 'The code is invalid or has expired.', 'error_description' => 'The code is invalid or has expired.']),
                new OA\Examples(example: 'password_unchanged', summary: 'Same as current', value: ['error' => 'password_unchanged', 'message' => 'The new password must be different from your current password.', 'error_description' => 'The new password must be different from your current password.']),
            ])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'OTP locked / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(ResetUserPasswordRequest $request): JsonResponse
    {
        return response()->json([
            'token' => User::resetPasswordWithOtp(
                $request->channelIdentifier(),
                $request->validated('otp'),
                $request->validated('new_password'),
                $request->channel(),
            ),
        ]);
    }
}
