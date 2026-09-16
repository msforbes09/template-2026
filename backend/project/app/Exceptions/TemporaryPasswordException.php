<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an administrator still holding a temporary password accesses a
 * route that requires a changed password (HTTP 403).
 */
class TemporaryPasswordException extends CustomException
{
    protected string $error = 'temporary_password';

    protected string $errorMessage = 'Your temporary password must be changed first.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
