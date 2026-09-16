<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Requests\ChangePasswordRequest;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Change the authenticated administrator's password.
 */
class ChangePasswordController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/change-password',
        summary: 'Change the authenticated administrator password',
        description: 'Verifies the current password and sets a new one. The new password may not match any of the last PASSWORD_HISTORY_LIMIT passwords, and a voluntary change (temporary passwords excepted) is refused until PASSWORD_MIN_AGE_HOURS have passed since the last change. Revokes all existing tokens and returns a fresh one.',
        security: [['bearerAuth' => []]],
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['current_password', 'new_password', 'new_password_confirmation'],
                properties: [
                    new OA\Property(property: 'current_password', type: 'string', format: 'password', example: 'Current@123'),
                    new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'BrandNew@456'),
                    new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'BrandNew@456'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Password changed — all prior tokens are revoked and a fresh one is returned', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')],
            )),
            new OA\Response(response: 400, description: 'Changed too recently', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'password_changed_too_recently', 'message' => 'Your password was changed recently. Please try again later.', 'error_description' => 'Your password was changed recently. Please try again later.', 'meta' => ['available_at' => '2026-09-17 09:00:00']])),
            new OA\Response(response: 422, description: 'Validation error (wrong current, weak, unchanged or recently used new password)', content: new OA\JsonContent(
                ref: '#/components/schemas/ValidationError',
                examples: [
                    new OA\Examples(example: 'current_password', summary: 'Wrong current password', value: ['message' => 'The current password is incorrect.', 'errors' => ['current_password' => ['The current password is incorrect.']]]),
                    new OA\Examples(example: 'recently_used', summary: 'Recently used password', value: ['message' => 'You have used this password recently. Please choose a different one.', 'errors' => ['new_password' => ['You have used this password recently. Please choose a different one.']]]),
                ],
            )),
        ],
    )]
    public function __invoke(ChangePasswordRequest $request): JsonResponse
    {
        $administrator = Administrator::authenticated();

        // Returns a fresh token: the change revoked every prior token, so the caller
        // must switch to this one (a stolen session dies with the password).
        return response()->json([
            'token' => $administrator->changePassword($request->validated('new_password')),
        ]);
    }
}
