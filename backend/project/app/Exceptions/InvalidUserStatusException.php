<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an action is not allowed for the account's current status (HTTP 400).
 */
class InvalidUserStatusException extends CustomException
{
    protected string $error = 'invalid_status';

    protected string $errorMessage = 'This action is not allowed for the current account status.';

    // 400, not 422: 422 is reserved for Laravel validation.
    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
