<?php

namespace App\Http\Controllers\Users\Password;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\ChangeUserPasswordRequest;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Change the authenticated user's password and return a fresh token (every other
 * session is revoked).
 */
class ChangePasswordController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/change-password',
        summary: "Change the authenticated user's password",
        description: 'Verifies the current password and sets a new one. The new password may not match any of the last PASSWORD_HISTORY_LIMIT passwords, and a change is refused until PASSWORD_MIN_AGE_HOURS have passed since the last one. Revokes all existing tokens and returns a fresh one.',
        security: [['bearerAuth' => []]],
        tags: ['Password'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['current_password', 'new_password', 'new_password_confirmation'],
            properties: [
                new OA\Property(property: 'current_password', type: 'string', format: 'password', example: 'Secret@123'),
                new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'BrandNew@456'),
                new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'BrandNew@456'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Changed', content: new OA\JsonContent(properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')])),
            new OA\Response(response: 400, description: 'Changed too recently', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'password_changed_too_recently', 'message' => 'Your password was changed recently. Please try again later.', 'error_description' => 'Your password was changed recently. Please try again later.', 'meta' => ['available_at' => '2026-09-17 09:00:00']])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error (wrong current, weak, unchanged or recently used new password)', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError', example: ['message' => 'You have used this password recently. Please choose a different one.', 'errors' => ['new_password' => ['You have used this password recently. Please choose a different one.']]])),
            new OA\Response(response: 429, description: 'Too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(ChangeUserPasswordRequest $request): JsonResponse
    {
        return response()->json([
            'token' => $request->user()->updatePassword($request->validated('new_password')),
        ]);
    }
}
