<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a rate-limited endpoint is called too often (HTTP 429).
 */
class TooManyRequestsException extends CustomException
{
    protected string $error = 'too_many_requests';

    protected string $errorMessage = 'Too many requests. Please slow down and try again shortly.';

    // No retry_after / timing is exposed here — that would let an attacker time
    // their brute-force attempts against the rate limiter.
    protected int $statusCode = Response::HTTP_TOO_MANY_REQUESTS;
}
