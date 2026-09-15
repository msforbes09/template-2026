<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a submitted PIN is wrong, missing, or expired (HTTP 400).
 */
class InvalidOtpException extends CustomException
{
    protected string $error = 'invalid_otp';

    protected string $errorMessage = 'The one-time PIN is invalid or has expired.';

    // 400, not 422: 422 is reserved for Laravel validation (the {message, errors}
    // shape). Custom domain errors use the standard {error, message, ...} envelope.
    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    /**
     * @param  int|null  $remainingAttempts  Attempts left before lockout, when known.
     */
    public function __construct(?int $remainingAttempts = null)
    {
        parent::__construct();

        if ($remainingAttempts !== null) {
            $this->meta = ['remaining_attempts' => $remainingAttempts];
        }
    }
}
