<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when valid credentials still require an emailed OTP to finish login (HTTP 428).
 */
class TwoFactorRequiredException extends CustomException
{
    protected string $error = 'two_factor_required';

    protected string $errorMessage = 'A verification code has been sent to your email.';

    protected int $statusCode = Response::HTTP_PRECONDITION_REQUIRED;

    /**
     * @param  string  $authToken  The pending-2FA handle for two_factor_authenticate.
     * @param  string  $resendToken  The OTP handle for otp/resend.
     * @param  int  $retryAfter  Seconds until a resend is allowed.
     */
    public function __construct(string $authToken, string $resendToken, int $retryAfter = 0)
    {
        parent::__construct();

        $this->meta = ['auth_token' => $authToken, 'resend_token' => $resendToken, 'retry_after' => $retryAfter];
    }
}
