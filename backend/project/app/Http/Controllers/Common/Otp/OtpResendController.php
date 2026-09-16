<?php

namespace App\Http\Controllers\Common\Otp;

use App\Events\Otp\OtpIssued;
use App\Http\Controllers\Controller;
use App\Models\Misc\Otps\Requests\OtpResendRequest;
use App\Services\Otp\OtpService;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Re-send an OTP for any type, identified by its resend token.
 */
class OtpResendController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/otp/resend',
        summary: 'Re-send a one-time PIN',
        description: 'Re-issues and re-sends the OTP identified by its resend token (subject to the resend cooldown).',
        tags: ['OTP'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['resend_token'],
                properties: [
                    new OA\Property(property: 'resend_token', type: 'string', description: 'The resend_token issued when the OTP was created', example: 'Rs8kPfa2Qz7bVn4mLtR9sYcE1wHgUj60'),
                    new OA\Property(property: 'captcha', type: 'string', description: 'Cloudflare Turnstile token (required when CAPTCHA is enabled)', example: '0.abc123-turnstile-token'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'OTP re-sent', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'resend_token', type: 'string', example: 'Rs8kPfa2Qz7bVn4mLtR9sYcE1wHgUj60'),
                    new OA\Property(property: 'retry_after', type: 'integer', description: 'Seconds until another resend is allowed', example: 60),
                ],
            )),
            new OA\Response(response: 400, description: 'Unknown or expired resend token', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'invalid_otp', 'message' => 'The one-time PIN is invalid or has expired.', 'error_description' => 'The one-time PIN is invalid or has expired.'])),
            new OA\Response(response: 429, description: 'Cooldown not elapsed or temporarily locked', content: new OA\JsonContent(
                ref: '#/components/schemas/TooManyRequestsError',
                examples: [
                    'otp_throttled' => new OA\Examples(example: 'otp_throttled', summary: 'Resend cooldown', value: ['error' => 'otp_throttled', 'message' => 'Please wait before requesting another one-time PIN.', 'error_description' => 'Please wait before requesting another one-time PIN.', 'meta' => ['retry_after' => 42]]),
                    'otp_locked' => new OA\Examples(example: 'otp_locked', summary: 'Temporarily locked', value: ['error' => 'otp_locked', 'message' => 'Too many attempts. Please try again later.', 'error_description' => 'Too many attempts. Please try again later.', 'meta' => ['retry_after' => 900]]),
                ],
            )),
        ],
    )]
    public function __invoke(OtpResendRequest $request, OtpService $service): JsonResponse
    {
        $result = $service->resend($request->validated('resend_token'));

        OtpIssued::dispatch($result);

        return response()->json([
            'resend_token' => $result->resendToken,
            'retry_after' => $result->retryAfter,
        ]);
    }
}
