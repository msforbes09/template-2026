<?php

namespace App\Http\Controllers\Users\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\TwoFactorAuthenticateUserRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Complete the user two-factor handshake and issue a bearer token plus a
 * trusted-device token.
 */
class TwoFactorAuthenticateController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/two-factor-authenticate',
        summary: 'Complete user two-factor authentication',
        description: 'Verifies the emailed OTP for a pending handshake, issues a bearer token, and returns a trusted-device token that skips 2FA within the trust window.',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['auth_token', 'pin'],
            properties: [
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'sms'], description: 'Must match the authenticate step (default email).', example: 'email'),
                new OA\Property(property: 'auth_token', type: 'string', example: 'Zx7pQa2Kd9bVn4mLtR8sYcE1wHgUj60F'),
                new OA\Property(property: 'pin', type: 'string', example: '123456'),
                new OA\Property(property: 'captcha', type: 'string', description: 'Cloudflare Turnstile token (required when enabled)', example: '0.abc-turnstile'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Authenticated', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext'),
                    new OA\Property(property: 'device_token', type: 'string', example: 'kD9xPfa2Qz7bVn4mLtR8sYcE1wHgUj60'),
                ],
            )),
            new OA\Response(response: 400, description: 'Invalid handshake or OTP', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_credentials', summary: 'Unknown or expired handshake', value: ['error' => 'invalid_credentials', 'message' => 'Invalid credentials.', 'error_description' => 'Invalid credentials.']),
                new OA\Examples(example: 'invalid_otp', summary: 'Wrong or expired PIN', value: ['error' => 'invalid_otp', 'message' => 'The code is invalid or has expired.', 'error_description' => 'The code is invalid or has expired.', 'meta' => ['remaining_attempts' => 4]]),
                new OA\Examples(example: 'account_inactive', summary: 'Switched off mid-handshake', value: ['error' => 'account_inactive', 'message' => 'This account is inactive.', 'error_description' => 'This account is inactive.']),
            ])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'OTP locked / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError', examples: [
                new OA\Examples(example: 'otp_locked', summary: 'Too many wrong PINs', value: ['error' => 'otp_locked', 'message' => 'Too many attempts. Please try again later.', 'error_description' => 'Too many attempts. Please try again later.']),
                new OA\Examples(example: 'too_many_requests', summary: 'Endpoint rate limit', value: ['error' => 'too_many_requests', 'message' => 'Too many requests.', 'error_description' => 'Too many requests.']),
            ])),
        ],
    )]
    public function __invoke(TwoFactorAuthenticateUserRequest $request): JsonResponse
    {
        return response()->json(
            User::completeTwoFactor(
                $request->validated('auth_token'),
                $request->validated('pin'),
                $request->channel(),
            ),
        );
    }
}
