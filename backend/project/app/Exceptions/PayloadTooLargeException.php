<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when the proxied request body exceeds the configured size cap.
 */
class PayloadTooLargeException extends CustomException
{
    protected string $error = 'payload_too_large';

    protected string $errorMessage = 'The request body is too large.';

    protected int $statusCode = Response::HTTP_REQUEST_ENTITY_TOO_LARGE;
}
