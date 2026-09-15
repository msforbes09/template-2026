<?php

namespace App\Http\Controllers\Users\Password;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\ForgotPasswordRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Begin a password reset: email a reset code for a resettable account, a "no
 * account" notice otherwise — the response is identical either way.
 */
class ForgotPasswordController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/forgot-password',
        summary: 'Request a password reset code',
        description: 'Emails a reset code if the address has a password-based account, or a "no account" notice otherwise. The response is identical either way (no account-existence disclosure). Resend the code via POST /common/otp/resend.',
        tags: ['Password'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['email'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                new OA\Property(property: 'captcha', type: 'string', example: 'cf-turnstile-response-token'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Code sent — returns the resend handle and cooldown. Identical whether or not the email has an account.', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'resend_token', type: 'string', example: 'a1b2c3d4...'),
                    new OA\Property(property: 'retry_after', type: 'integer', example: 60),
                ],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Cooldown / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $result = User::sendPasswordResetOtp($request->validated('email'));

        return response()->json([
            'resend_token' => $result->resendToken,
            'retry_after' => $result->retryAfter,
        ]);
    }
}
