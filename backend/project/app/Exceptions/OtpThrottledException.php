<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a PIN is requested again before the resend cooldown elapses (HTTP 429).
 */
class OtpThrottledException extends CustomException
{
    protected string $error = 'otp_throttled';

    protected string $errorMessage = 'Please wait before requesting another one-time PIN.';

    protected int $statusCode = Response::HTTP_TOO_MANY_REQUESTS;

    /**
     * @param  int  $retryAfter  Seconds until another send is allowed.
     */
    public function __construct(int $retryAfter)
    {
        parent::__construct();

        $this->meta = ['retry_after' => $retryAfter];
    }
}
