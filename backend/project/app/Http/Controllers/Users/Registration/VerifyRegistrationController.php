<?php

namespace App\Http\Controllers\Users\Registration;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\VerifyRegistrationRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Complete a website registration: verify the OTP, create the draft account
 * with the chosen password, and return a bearer token.
 */
class VerifyRegistrationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/verify-registration',
        summary: 'Complete website registration (verify OTP, set password)',
        description: 'Verifies the one-time code sent to the email and, only on success, creates the draft account with the chosen password. Returns a bearer token for the new draft session.',
        tags: ['Registration'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['email', 'otp', 'password', 'password_confirmation'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                new OA\Property(property: 'otp', type: 'string', example: '123456'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Secret@123'),
                new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: 'Secret@123'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Registered', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'token', type: 'string', example: '9|abc...plaintext')],
            )),
            new OA\Response(response: 400, description: 'Invalid or expired code', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'invalid_otp', 'message' => 'The code is invalid or has expired.', 'error_description' => 'The code is invalid or has expired.'])),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Too many attempts', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(VerifyRegistrationRequest $request): JsonResponse
    {
        return response()->json([
            'token' => User::completeRegistration(
                $request->validated('email'),
                $request->validated('otp'),
                $request->validated('password'),
            ),
        ]);
    }
}
