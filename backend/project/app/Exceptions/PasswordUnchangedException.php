<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a new password equals the current one (HTTP 400).
 */
class PasswordUnchangedException extends CustomException
{
    protected string $error = 'password_unchanged';

    protected string $errorMessage = 'The new password must be different from your current password.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
