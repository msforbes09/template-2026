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
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(
                ref: '#/components/schemas/ValidationError',
                example: [
                    'message' => 'The current password is incorrect.',
                    'errors' => ['current_password' => ['The current password is incorrect.']],
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
