<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an administrator asks to postpone a password expiry that cannot
 * be postponed: the password has not expired, or every postponement has been
 * used (HTTP 400).
 */
class PasswordExpiryWaiveUnavailableException extends CustomException
{
    protected string $error = 'password_expiry_waive_unavailable';

    protected string $errorMessage = 'The password expiry cannot be postponed.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
