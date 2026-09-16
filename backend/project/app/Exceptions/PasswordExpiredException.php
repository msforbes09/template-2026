<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an administrator whose password has expired, with no
 * postponements left, accesses a route that requires a current password
 * (HTTP 403). Only the profile, change-password and logout routes stay open.
 */
class PasswordExpiredException extends CustomException
{
    protected string $error = 'password_expired';

    protected string $errorMessage = 'Your password has expired and must be changed before you continue.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
