<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a request is forbidden (HTTP 403).
 */
class AccessDeniedHttpException extends CustomException
{
    protected string $error = 'forbidden';

    protected string $errorMessage = 'Forbidden.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
