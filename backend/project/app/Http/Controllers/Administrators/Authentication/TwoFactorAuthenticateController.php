<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\TwoFactorAuthenticateRequest;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Complete two-factor authentication and issue a bearer + device token.
 */
class TwoFactorAuthenticateController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/two-factor-authenticate',
        summary: 'Complete two-factor authentication',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['auth_token', 'pin'],
                properties: [
                    new OA\Property(property: 'auth_token', type: 'string', description: 'The auth_token from the 428 response', example: 'Zx7pQa2Kd9bVn4mLtR8sYcE1wHgUj60F'),
                    new OA\Property(property: 'pin', type: 'string', example: '123456'),
                    new OA\Property(property: 'captcha', type: 'string', description: 'Cloudflare Turnstile token (required when CAPTCHA is enabled)', example: '0.abc123-turnstile-token'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Authenticated', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'token', type: 'string'),
                    new OA\Property(property: 'device_token', type: 'string', description: 'Send on future logins to skip 2FA within the trust window'),
                ],
            )),
            new OA\Response(response: 400, description: 'The handshake could not be completed', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', examples: [
                new OA\Examples(example: 'invalid_otp', summary: 'Wrong or expired PIN', value: ['error' => 'invalid_otp', 'message' => 'The one-time PIN is invalid or has expired.', 'error_description' => 'The one-time PIN is invalid or has expired.', 'meta' => ['remaining_attempts' => 4]]),
                new OA\Examples(example: 'invalid_credentials', summary: 'Unknown auth_token', value: ['error' => 'invalid_credentials', 'message' => 'The provided credentials are incorrect.', 'error_description' => 'The provided credentials are incorrect.']),
                new OA\Examples(example: 'account_inactive', summary: 'Account switched off mid-handshake', value: ['error' => 'account_inactive', 'message' => 'This account is inactive.', 'error_description' => 'This account is inactive.']),
            ])),
            new OA\Response(response: 429, description: 'Too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError', examples: [
                new OA\Examples(example: 'otp_locked', summary: 'Too many wrong PINs — temporarily locked. The attempt count is cumulative across resends.', value: ['error' => 'otp_locked', 'message' => 'Too many attempts. Please try again later.', 'error_description' => 'Too many attempts. Please try again later.']),
                new OA\Examples(example: 'too_many_requests', summary: 'Endpoint rate limit (5/min per IP)', value: ['error' => 'too_many_requests', 'message' => 'Too many requests. Please try again later.', 'error_description' => 'Too many requests. Please try again later.']),
            ])),
        ],
    )]
    public function __invoke(TwoFactorAuthenticateRequest $request): JsonResponse
    {
        return response()->json(
            Administrator::completeTwoFactor($request->validated('auth_token'), $request->validated('pin')),
        );
    }
}
