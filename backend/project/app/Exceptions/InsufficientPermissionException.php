<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an authenticated administrator's token lacks a required ability (HTTP 403).
 */
class InsufficientPermissionException extends CustomException
{
    protected string $error = 'insufficient_permissions';

    protected string $errorMessage = 'You do not have the required permission.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
