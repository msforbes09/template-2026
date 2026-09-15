<?php

namespace App\Http\Controllers\Users\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\AuthenticateUserRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Authenticate a user with email + password and issue a bearer token,
 * or begin the two-factor handshake.
 */
class AuthenticateController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/authenticate',
        summary: 'Authenticate a user (email + password)',
        description: 'Verifies credentials (email + password). With 2FA disabled or a trusted device, returns a bearer token; otherwise emails an OTP and responds 428 with a handshake handle.',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['email', 'password'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Secret@123'),
                new OA\Property(property: 'device_token', type: 'string', nullable: true, description: 'Trusted-device token to skip 2FA within the trust window', example: 'kD9xPfa2Qz7bVn4mLtR8sYcE1wHgUj60'),
                new OA\Property(property: 'captcha', type: 'string', description: 'Cloudflare Turnstile token (required when enabled)', example: '0.abc-turnstile'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Authenticated (2FA off or trusted device)', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')],
            )),
            new OA\Response(response: 428, description: 'Two-factor required — an OTP was emailed', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope', example: ['error' => 'two_factor_required', 'message' => 'A verification code has been sent to your email.', 'error_description' => 'A verification code has been sent to your email.', 'meta' => ['auth_token' => 'Zx7pQa...', 'resend_token' => 'Rs8kPf...', 'retry_after' => 60]])),
            new OA\Response(response: 400, description: 'Invalid credentials or inactive account', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_credentials', summary: 'Invalid credentials', value: ['error' => 'invalid_credentials', 'message' => 'Invalid credentials.', 'error_description' => 'Invalid credentials.']),
                new OA\Examples(example: 'account_inactive', summary: 'Inactive account', value: ['error' => 'account_inactive', 'message' => 'This account is inactive.', 'error_description' => 'This account is inactive.']),
            ])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(AuthenticateUserRequest $request): JsonResponse
    {
        return response()->json([
            'token' => User::attemptTwoFactor(
                $request->safe()->except('device_token'),
                $request->validated('device_token'),
            ),
        ]);
    }
}
