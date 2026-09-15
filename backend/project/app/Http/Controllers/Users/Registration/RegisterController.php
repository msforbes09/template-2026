<?php

namespace App\Http\Controllers\Users\Registration;

use App\Http\Controllers\Controller;
use App\Models\Users\Requests\RegisterUserRequest;
use App\Models\Users\User;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Begin a website registration: validate, issue an email OTP (nothing is
 * persisted yet), and return the resend handle. The response is identical
 * whether or not the email is already registered (no existence disclosure); the
 * OTP is resent via the shared POST /common/otp/resend endpoint.
 */
class RegisterController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/register',
        summary: 'Begin website registration (email OTP)',
        description: 'Validates the identifier and names and sends a one-time code by email (channel=email, default) or SMS (channel=sms). No account is created at this step. The response is identical whether or not the identifier is already registered. Resend the code via POST /common/otp/resend with the returned resend_token.',
        tags: ['Registration'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['first_name', 'last_name', 'company_name'],
            properties: [
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'sms'], description: 'Delivery channel (default email). With sms, send mobile_number instead of email.', example: 'email'),
                new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Required when channel is email.', example: 'user@example.com'),
                new OA\Property(property: 'mobile_number', type: 'string', description: 'Required when channel is sms. Format +639XXXXXXXXX.', example: '+639171234567'),
                new OA\Property(property: 'first_name', type: 'string', example: 'Alex'),
                new OA\Property(property: 'last_name', type: 'string', example: 'Rivera'),
                new OA\Property(property: 'company_name', type: 'string', example: 'Acme Corp'),
                new OA\Property(property: 'captcha', type: 'string', example: 'cf-turnstile-response-token'),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'Code sent — returns the resend handle and cooldown. Identical whether or not the email is already registered.', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'resend_token', type: 'string', description: 'Handle for resending the code via POST /common/otp/resend.', example: 'a1b2c3d4...'),
                    new OA\Property(property: 'retry_after', type: 'integer', description: 'Seconds until the code may be resent.', example: 60),
                ],
            )),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Cooldown / too many requests', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError', examples: [
                new OA\Examples(example: 'otp_throttled', summary: 'Resend cooldown', value: ['error' => 'otp_throttled', 'message' => 'Please wait before requesting another one-time PIN.', 'error_description' => 'Please wait before requesting another one-time PIN.', 'meta' => ['retry_after' => 45]]),
                new OA\Examples(example: 'too_many_requests', summary: 'Rate limit', value: ['error' => 'too_many_requests', 'message' => 'Too many requests.', 'error_description' => 'Too many requests.']),
            ])),
        ],
    )]
    public function __invoke(RegisterUserRequest $request): JsonResponse
    {
        $result = User::startRegistration($request->safe()->only(['channel', 'email', 'mobile_number', 'first_name', 'last_name', 'company_name']));

        return response()->json([
            'resend_token' => $result->resendToken,
            'retry_after' => $result->retryAfter,
        ]);
    }
}
