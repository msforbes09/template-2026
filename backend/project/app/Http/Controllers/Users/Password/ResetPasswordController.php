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
            required: ['email', 'otp', 'new_password', 'new_password_confirmation'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                new OA\Property(property: 'otp', type: 'string', example: '123456'),
                new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'BrandNew@456'),
                new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'BrandNew@456'),
                new OA\Property(property: 'captcha', type: 'string', example: 'cf-turnstile-response-token'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Reset', content: new OA\JsonContent(properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')])),
            new OA\Response(response: 400, description: 'Invalid code', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'invalid_otp', 'message' => 'The code is invalid or has expired.', 'error_description' => 'The code is invalid or has expired.'])),
            new OA\Response(response: 422, description: 'Validation error (weak, or a recently used password — the current one included)', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError', example: ['message' => 'You have used this password recently. Please choose a different one.', 'errors' => ['new_password' => ['You have used this password recently. Please choose a different one.']]])),
            new OA\Response(response: 429, description: 'OTP locked / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(ResetUserPasswordRequest $request): JsonResponse
    {
        return response()->json([
            'token' => User::resetPasswordWithOtp(
                $request->validated('email'),
                $request->validated('otp'),
                $request->validated('new_password'),
            ),
        ]);
    }
}
