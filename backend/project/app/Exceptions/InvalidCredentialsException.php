<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when authentication credentials do not match.
 */
class InvalidCredentialsException extends CustomException
{
    protected string $error = 'invalid_credentials';

    protected string $errorMessage = 'Invalid credentials.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
