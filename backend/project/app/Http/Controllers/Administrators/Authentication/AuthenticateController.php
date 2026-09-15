<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\AuthenticateRequest;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Authenticate an administrator and issue a bearer token.
 */
class AuthenticateController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/authenticate',
        summary: 'Authenticate an administrator',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Secret@123'),
                    new OA\Property(property: 'device_token', type: 'string', nullable: true, description: 'Trusted-device token to skip 2FA within the trust window', example: 'kD9xPfa2Qz7bVn4mLtR8sYcE1wHgUj60'),
                    new OA\Property(property: 'captcha', type: 'string', description: 'Cloudflare Turnstile token (required when CAPTCHA is enabled)', example: '0.abc123-turnstile-token'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Authenticated (2FA disabled or trusted device)', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'token', type: 'string')],
            )),
            new OA\Response(response: 428, description: 'Two-factor verification required — an OTP was emailed', content: new OA\JsonContent(
                ref: '#/components/schemas/ErrorEnvelope',
                example: ['error' => 'two_factor_required', 'message' => 'A verification code has been sent to your email.', 'error_description' => 'A verification code has been sent to your email.', 'meta' => ['auth_token' => 'Zx7pQa2Kd9bVn4mLtR8sYcE1wHgUj60F', 'resend_token' => 'Rs8kPfa2Qz7bVn4mLtR9sYcE1wHgUj60', 'retry_after' => 60]],
            )),
            new OA\Response(response: 429, description: 'Too many login attempts (rate-limited per email)', content: new OA\JsonContent(
                ref: '#/components/schemas/TooManyRequestsError',
                example: ['error' => 'too_many_requests', 'message' => 'Too many requests. Please slow down and try again shortly.', 'error_description' => 'Too many requests. Please slow down and try again shortly.'],
            )),
            new OA\Response(response: 400, description: 'Invalid credentials or inactive account', content: new OA\JsonContent(
                ref: '#/components/schemas/BadRequestError',
                examples: [
                    new OA\Examples(
                        example: 'invalid_credentials',
                        summary: 'Invalid credentials',
                        value: ['error' => 'invalid_credentials', 'message' => 'Invalid credentials.', 'error_description' => 'Invalid credentials.'],
                    ),
                    new OA\Examples(
                        example: 'account_inactive',
                        summary: 'Inactive account',
                        value: ['error' => 'account_inactive', 'message' => 'This account is inactive.', 'error_description' => 'This account is inactive.'],
                    ),
                ],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(
                ref: '#/components/schemas/ValidationError',
                example: ['message' => 'The email field is required.', 'errors' => ['email' => ['The email field is required.']]],
            )),
        ],
    )]
    public function __invoke(AuthenticateRequest $request): JsonResponse
    {
        return response()->json([
            'token' => Administrator::attemptTwoFactor(
                $request->safe()->except('device_token'),
                $request->validated('device_token'),
            ),
        ]);
    }
}
